// Package persistence provides Neon DB connectivity for the vertical crop AI engine.
// It uses pgx/v5 for high-performance PostgreSQL access and implements an in-memory
// ring buffer that allows the pipeline to continue processing when the database
// is temporarily unavailable (resilient offline-first design).
package persistence

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InsightRow represents a single row to be persisted in the ai_insights table.
type InsightRow struct {
	UserID        int       `json:"user_id"`
	SensorID      string    `json:"sensor_id"`
	Value         float64   `json:"value"`
	Regime        string    `json:"regime"`
	Confidence    float64   `json:"confidence"`
	Decision      string    `json:"decision"`
	HMACSignature string    `json:"hmac_signature"`
	CreatedAt     time.Time `json:"created_at"`
}

// Store manages database connectivity and the memory buffer for offline resilience.
type Store struct {
	pool     *pgxpool.Pool
	hmacKey  []byte
	mu       sync.Mutex
	buffer   []InsightRow
	bufCap   int
	flushCtx context.Context
	cancel   context.CancelFunc
}

// NewStore creates a new persistence store. If databaseURL is empty, the store
// operates in buffer-only mode (all writes are held in memory).
func NewStore(databaseURL string, hmacSecret string, bufferCapacity int) *Store {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Store{
		hmacKey:  []byte(hmacSecret),
		buffer:   make([]InsightRow, 0, bufferCapacity),
		bufCap:   bufferCapacity,
		flushCtx: ctx,
		cancel:   cancel,
	}

	if databaseURL != "" {
		// Ensure SSL mode is appended for Neon DB
		if !strings.Contains(databaseURL, "sslmode=") {
			if strings.Contains(databaseURL, "?") {
				databaseURL += "&sslmode=require"
			} else {
				databaseURL += "?sslmode=require"
			}
		}

		cfg, err := pgxpool.ParseConfig(databaseURL)
		if err != nil {
			log.Printf("[PERSIST] WARNING: invalid DATABASE_URL — operating in buffer-only mode: %v", err)
			return s
		}
		cfg.MaxConns = 5
		cfg.MinConns = 1
		cfg.MaxConnLifetime = 30 * time.Minute
		cfg.MaxConnIdleTime = 5 * time.Minute

		pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
		if err != nil {
			log.Printf("[PERSIST] WARNING: cannot connect to Neon DB — operating in buffer-only mode: %v", err)
			return s
		}

		// Verify connectivity
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer pingCancel()
		if err := pool.Ping(pingCtx); err != nil {
			log.Printf("[PERSIST] WARNING: Neon DB ping failed — will retry on writes: %v", err)
		} else {
			// Explicit SELECT test to guarantee query execution
			var testVal int
			if err := pool.QueryRow(pingCtx, "SELECT 1").Scan(&testVal); err == nil && testVal == 1 {
				log.Printf("[PERSIST] Conexión exitosa a Neon DB (pool: max=%d)", cfg.MaxConns)
			} else {
				log.Printf("[PERSIST] WARNING: SELECT ping fallido: %v", err)
			}
		}

		s.pool = pool

		// Start background flush goroutine
		go s.backgroundFlush()
	} else {
		log.Printf("[PERSIST] Running in buffer-only mode (no DATABASE_URL)")
	}

	return s
}

// SignInsight computes the HMAC-SHA256 signature for an insight row,
// ensuring IEEE-grade audit integrity.
func (s *Store) SignInsight(row *InsightRow) {
	if len(s.hmacKey) == 0 {
		row.HMACSignature = ""
		return
	}
	payload := fmt.Sprintf("%d|%s|%.8f|%s|%.8f|%s|%s",
		row.UserID, row.SensorID, row.Value, row.Regime,
		row.Confidence, row.Decision, row.CreatedAt.UTC().Format(time.RFC3339Nano))

	mac := hmac.New(sha256.New, s.hmacKey)
	mac.Write([]byte(payload))
	row.HMACSignature = hex.EncodeToString(mac.Sum(nil))
}

// Insert persists an insight row to the database. If the database is unavailable,
// the row is buffered in memory for later flushing (zero-downtime resilience).
func (s *Store) Insert(ctx context.Context, row *InsightRow) error {
	// Always sign before persisting
	s.SignInsight(row)

	if s.pool == nil {
		return s.bufferRow(*row)
	}

	insertCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	_, err := s.pool.Exec(insertCtx,
		`INSERT INTO ai_insights (user_id, sensor_id, value, regime, confidence, decision, hmac_signature, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		row.UserID, row.SensorID, row.Value, row.Regime,
		row.Confidence, row.Decision, row.HMACSignature, row.CreatedAt)

	if err != nil {
		log.Printf("[PERSIST] DB write failed, buffering: %v", err)
		return s.bufferRow(*row)
	}
	return nil
}

// InsertBatch persists multiple insight rows concurrently.
func (s *Store) InsertBatch(ctx context.Context, rows []InsightRow) error {
	if len(rows) == 0 {
		return nil
	}
	if s.pool == nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		for _, r := range rows {
			s.SignInsight(&r)
			if len(s.buffer) < s.bufCap {
				s.buffer = append(s.buffer, r)
			}
		}
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		// Buffer everything
		for _, r := range rows {
			s.bufferRow(r)
		}
		return err
	}

	for _, r := range rows {
		s.SignInsight(&r)
		_, err := tx.Exec(ctx,
			`INSERT INTO ai_insights (user_id, sensor_id, value, regime, confidence, decision, hmac_signature, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			r.UserID, r.SensorID, r.Value, r.Regime,
			r.Confidence, r.Decision, r.HMACSignature, r.CreatedAt)
		if err != nil {
			tx.Rollback(ctx)
			// Buffer everything
			for _, r2 := range rows {
				s.bufferRow(r2)
			}
			return err
		}
	}

	return tx.Commit(ctx)
}

func (s *Store) bufferRow(row InsightRow) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.buffer) >= s.bufCap {
		// Evict oldest (ring buffer semantics)
		s.buffer = s.buffer[1:]
	}
	s.buffer = append(s.buffer, row)
	return nil
}

// backgroundFlush periodically drains the memory buffer into the database.
func (s *Store) backgroundFlush() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.flushCtx.Done():
			return
		case <-ticker.C:
			s.flush()
		}
	}
}

func (s *Store) flush() {
	s.mu.Lock()
	if len(s.buffer) == 0 {
		s.mu.Unlock()
		return
	}
	batch := make([]InsightRow, len(s.buffer))
	copy(batch, s.buffer)
	s.buffer = s.buffer[:0]
	s.mu.Unlock()

	if s.pool == nil {
		// Re-buffer if no connection
		s.mu.Lock()
		s.buffer = append(s.buffer, batch...)
		s.mu.Unlock()
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		log.Printf("[PERSIST] Flush failed (begin tx): %v — re-buffering %d rows", err, len(batch))
		s.mu.Lock()
		s.buffer = append(batch, s.buffer...)
		s.mu.Unlock()
		return
	}

	for _, r := range batch {
		_, err := tx.Exec(ctx,
			`INSERT INTO ai_insights (user_id, sensor_id, value, regime, confidence, decision, hmac_signature, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			r.UserID, r.SensorID, r.Value, r.Regime,
			r.Confidence, r.Decision, r.HMACSignature, r.CreatedAt)
		if err != nil {
			tx.Rollback(ctx)
			s.mu.Lock()
			s.buffer = append(batch, s.buffer...)
			s.mu.Unlock()
			log.Printf("[PERSIST] Flush failed (insert): %v — re-buffered %d rows", err, len(batch))
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("[PERSIST] Flush failed (commit): %v", err)
		s.mu.Lock()
		s.buffer = append(batch, s.buffer...)
		s.mu.Unlock()
		return
	}

	log.Printf("[PERSIST] Flushed %d buffered rows to Neon DB", len(batch))
}

// BufferLen returns the current number of buffered (unflushed) rows.
func (s *Store) BufferLen() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.buffer)
}

// BufferContents returns a JSON snapshot of the current buffer for diagnostics.
func (s *Store) BufferContents() ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return json.Marshal(s.buffer)
}

// Close gracefully shuts down the store, flushing any remaining buffer.
func (s *Store) Close() {
	s.cancel()
	s.flush()
	if s.pool != nil {
		s.pool.Close()
		log.Printf("[PERSIST] Database pool closed")
	}
}
