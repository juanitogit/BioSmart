// gophermind_ai — High-Performance Cognitive Pipeline for Vertical Crop Monitoring
//
// This system implements a 15-phase cognitive pipeline for precision agriculture,
// migrated from an interpreted (Python) environment to compiled Go for
// deterministic, low-latency decision-making on edge devices.
//
// Architecture: Clean Room Design — no code derived from any existing implementation.
// Standards: ISO 13374 (Condition Monitoring), ISO 27001 (Audit Trail)
//
// Copyright (c) 2026. Designed for IEEE publication.
package main

import (
	"context"
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"gophermind_ai/internal/config"
	"gophermind_ai/internal/entities"
	"gophermind_ai/internal/persistence"
	"gophermind_ai/internal/pipeline"

	"github.com/joho/godotenv"
)

var (
	lastPipelineLatencyMs float64 = 0.42
	latencyMu             sync.RWMutex
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("[INIT] No se pudo cargar ../.env explícitamente: %v", err)
	}

	cfg := config.Load()

	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Printf("╔══════════════════════════════════════════════════════════════╗")
	log.Printf("║  gophermind_ai — Cognitive Pipeline v2.0 (BioSmart)     ║")
	log.Printf("║  15-Phase Pipeline | Go %s                          ║", "1.26")
	log.Printf("║  Budget: %dms | Port: %s | DB: %v                   ║",
		cfg.PipelineBudgetMs, cfg.ServerPort, cfg.DatabaseURL != "")
	log.Printf("╚══════════════════════════════════════════════════════════════╝")

	executor := pipeline.NewExecutor(cfg)

	// Initialize persistence store (connects to Neon DB or runs in buffer mode)
	store := persistence.NewStore(cfg.DatabaseURL, cfg.HMACSecret, cfg.BufferCapacity)
	defer store.Close()

	mux := http.NewServeMux()

	// ── CORS Middleware ──────────────────────────────────────
	corsHandler := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-ID")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// ── Ping ──────────────────────────────────────────────────
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "pong"})
	})

	// ── Health ────────────────────────────────────────────────
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		latencyMu.RLock()
		latency := lastPipelineLatencyMs
		latencyMu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"service":             "gophermind_ai",
			"status":              "ok",
			"version":             "2.0.0",
			"buffer_len":          store.BufferLen(),
			"pipeline_latency_ms": latency,
		})
	})

	// ── POST /predict — Single sensor window (legacy compatible) ──
	mux.HandleFunc("/predict", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			SeriesID   string    `json:"series_id"`
			Values     []float64 `json:"values"`
			Timestamps []float64 `json:"timestamps"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if len(req.Values) == 0 {
			http.Error(w, "values required", http.StatusBadRequest)
			return
		}

		window := &entities.SensorWindow{
			SeriesID:   req.SeriesID,
			Values:     req.Values,
			Timestamps: req.Timestamps,
		}

		result, record := executor.Execute(window)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"prediction": result,
			"compliance": record,
		})
	})

	// ── POST /analyze — BioSmart multi-rack analysis with user identity ──
	// This is the primary endpoint called by the Express backend proxy.
	// It processes multiple sensor readings concurrently and persists insights.
	mux.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}

		var req AnalyzeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if len(req.Readings) == 0 {
			http.Error(w, "readings required", http.StatusBadRequest)
			return
		}

		// Process all racks concurrently using goroutines + channels
		type rackResult struct {
			Index  int
			Result *entities.PredictionResult
			Record *entities.ComplianceRecord
			Sensor string
		}

		resultCh := make(chan rackResult, len(req.Readings))
		var wg sync.WaitGroup

		for i, reading := range req.Readings {
			wg.Add(1)
			go func(idx int, rd SensorReading) {
				defer wg.Done()

				window := &entities.SensorWindow{
					SeriesID:   rd.SensorID,
					Values:     rd.Values,
					Timestamps: rd.Timestamps,
				}

				result, record := executor.Execute(window)
				resultCh <- rackResult{
					Index:  idx,
					Result: result,
					Record: record,
					Sensor: rd.SensorID,
				}
			}(i, reading)
		}

		// Close channel when all goroutines complete
		go func() {
			wg.Wait()
			close(resultCh)
		}()

		// Collect results
		insights := make([]InsightResponse, len(req.Readings))
		var criticalAlerts []CriticalAlert
		var insightRows []persistence.InsightRow

		for rr := range resultCh {
			// Determine decision label for persistence
			decision := "LOG"
			if rr.Result.Metadata != nil {
				if d, ok := rr.Result.Metadata["decision"].(string); ok {
					switch d {
					case "ESCALATE":
						decision = "CRITICAL"
					case "INVESTIGATE":
						decision = "MONITOR"
					case "MONITOR":
						decision = "MONITOR"
					default:
						decision = "LOG"
					}
				}
			}

			// Determine regime
			regime := "STABLE"
			if rr.Result.Metadata != nil {
				if r, ok := rr.Result.Metadata["regime"].(string); ok {
					regime = r
				}
			}

			// Extract sanitized value
			sanitizedValue := 0.0
			if rr.Result.PredictedValue != nil {
				sanitizedValue = *rr.Result.PredictedValue
			}

			// Build insight for response
			insights[rr.Index] = InsightResponse{
				SensorID:   rr.Sensor,
				Value:      sanitizedValue,
				Regime:     regime,
				Confidence: rr.Result.Confidence,
				Decision:   decision,
				Trend:      rr.Result.Trend,
				TimingMs:   0,
				Metadata:   rr.Result.Metadata,
			}
			if rr.Result.Metadata != nil {
				if t, ok := rr.Result.Metadata["pipeline_total_ms"].(float64); ok {
					insights[rr.Index].TimingMs = t
					latencyMu.Lock()
					lastPipelineLatencyMs = t
					latencyMu.Unlock()
				}
			}

			// Collect HMAC signature from compliance record
			hmacSig := ""
			if rr.Record != nil && rr.Record.HMACSHA256 != nil {
				hmacSig = *rr.Record.HMACSHA256
			}

			// Build persistence row
			insightRows = append(insightRows, persistence.InsightRow{
				UserID:        req.UserID,
				SensorID:      rr.Sensor,
				Value:         sanitizedValue,
				Regime:        regime,
				Confidence:    rr.Result.Confidence,
				Decision:      decision,
				HMACSignature: hmacSig,
				CreatedAt:     time.Now().UTC(),
			})

			// Flag critical alerts for real-time notification
			if decision == "CRITICAL" {
				criticalAlerts = append(criticalAlerts, CriticalAlert{
					SensorID:   rr.Sensor,
					Value:      sanitizedValue,
					Regime:     regime,
					Confidence: rr.Result.Confidence,
					Message:    buildAlertMessage(rr.Sensor, sanitizedValue, regime, rr.Result.Confidence),
				})
			}
		}

		// Persist insights to Neon DB asynchronously
		go func() {
			if err := store.InsertBatch(context.Background(), insightRows); err != nil {
				log.Printf("[ANALYZE] Batch persistence error: %v", err)
			}
		}()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalyzeResponse{
			UserID:         req.UserID,
			Insights:       insights,
			CriticalAlerts: criticalAlerts,
			ProcessedAt:    time.Now().UTC().Format(time.RFC3339Nano),
			TotalRacks:     len(req.Readings),
			BufferLen:      store.BufferLen(),
		})
	})

	// ── GET /buffer — Diagnostics: view buffered rows ──
	mux.HandleFunc("/buffer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		data, err := store.BufferContents()
		if err != nil {
			http.Error(w, "buffer error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"buffer_len": store.BufferLen(),
			"rows":       json.RawMessage(data),
		})
	})

	// ── GET /demo — Synthetic demo ──
	mux.HandleFunc("/demo", func(w http.ResponseWriter, r *http.Request) {
		results := runDemo(executor)
		w.Header().Set("Content-Type", "application/json")
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		enc.Encode(results)
	})

	// ── Start Server ──
	addr := "0.0.0.0:" + cfg.ServerPort
	server := &http.Server{
		Addr:         addr,
		Handler:      corsHandler(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[SERVER] Listening on http://%s", addr)
		log.Printf("[GO] Motor de IA iniciado en puerto 8090")
		log.Printf("AI Engine saltando a la arena en http://127.0.0.1:8090")
		log.Printf("[SERVER] Endpoints: GET /ping | GET /health | POST /predict | POST /analyze | GET /demo | GET /buffer")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-done
	log.Printf("[SERVER] Shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	server.Shutdown(ctx)
	store.Close()
	log.Printf("[SERVER] Shutdown complete.")
}

// ── Request / Response Types ─────────────────────────────────

// AnalyzeRequest is the payload sent by the Express backend proxy.
type AnalyzeRequest struct {
	UserID   int             `json:"user_id"`
	Readings []SensorReading `json:"readings"`
}

// SensorReading represents a single sensor's data window.
type SensorReading struct {
	SensorID   string    `json:"sensor_id"`
	Values     []float64 `json:"values"`
	Timestamps []float64 `json:"timestamps"`
}

// AnalyzeResponse is returned to the Express backend.
type AnalyzeResponse struct {
	UserID         int              `json:"user_id"`
	Insights       []InsightResponse `json:"insights"`
	CriticalAlerts []CriticalAlert  `json:"critical_alerts"`
	ProcessedAt    string           `json:"processed_at"`
	TotalRacks     int              `json:"total_racks"`
	BufferLen      int              `json:"buffer_len"`
}

// InsightResponse represents a single processed sensor insight.
type InsightResponse struct {
	SensorID   string                 `json:"sensor_id"`
	Value      float64                `json:"value"`
	Regime     string                 `json:"regime"`
	Confidence float64                `json:"confidence"`
	Decision   string                 `json:"decision"`
	Trend      string                 `json:"trend"`
	TimingMs   float64                `json:"timing_ms"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// CriticalAlert is emitted when the pipeline detects an ESCALATE decision.
type CriticalAlert struct {
	SensorID   string  `json:"sensor_id"`
	Value      float64 `json:"value"`
	Regime     string  `json:"regime"`
	Confidence float64 `json:"confidence"`
	Message    string  `json:"message"`
}

func buildAlertMessage(sensorID string, value float64, regime string, confidence float64) string {
	return "⚠️ ALERTA CRÍTICA: Sensor " + sensorID +
		" detectó anomalía severa. Régimen: " + regime +
		". Acción inmediata requerida."
}

// runDemo generates synthetic sensor data for 5 vertical crop sensors
// and processes them through the pipeline.
func runDemo(executor *pipeline.Executor) []map[string]interface{} {
	rng := rand.New(rand.NewSource(42))
	sensors := []struct {
		id      string
		baseVal float64
		noise   float64
		trend   float64
		desc    string
	}{
		{"rack_01_temperature", 24.0, 0.3, 0.01, "Temperature (°C) — stable with slight upward drift"},
		{"rack_01_ph", 6.0, 0.05, -0.002, "pH — slow acidification trend"},
		{"rack_01_ec", 1.8, 0.15, 0.0, "EC (mS/cm) — noisy but stable"},
		{"rack_02_co2", 800.0, 30.0, 5.0, "CO₂ (ppm) — trending upward (poor ventilation)"},
		{"rack_02_humidity", 72.0, 4.0, 0.0, "Humidity (%RH) — volatile (misting cycles)"},
	}

	var results []map[string]interface{}

	for _, s := range sensors {
		values := make([]float64, 50)
		timestamps := make([]float64, 50)
		base := time.Now().Add(-50 * time.Minute).Unix()

		for i := 0; i < 50; i++ {
			values[i] = s.baseVal + s.trend*float64(i) + rng.NormFloat64()*s.noise
			timestamps[i] = float64(base + int64(i*60))
		}

		if s.id == "rack_02_co2" {
			values[45] = s.baseVal + 500.0
		}

		window := &entities.SensorWindow{
			SeriesID:   s.id,
			Values:     values,
			Timestamps: timestamps,
		}

		result, record := executor.Execute(window)

		results = append(results, map[string]interface{}{
			"sensor":      s.id,
			"description": s.desc,
			"prediction":  result,
			"record_id":   record.RecordID,
			"timing_ms":   record.PipelineTiming.TotalMs,
			"decision":    result.Metadata["decision"],
			"regime":      result.Metadata["regime"],
		})
	}

	log.Printf("═══ Demo Summary ═══")
	for _, r := range results {
		pred := r["prediction"].(*entities.PredictionResult)
		val := 0.0
		if pred.PredictedValue != nil {
			val = *pred.PredictedValue
		}
		log.Printf("  %-30s → predicted=%.2f conf=%.2f regime=%s decision=%s (%.2fms)",
			r["sensor"], val, pred.Confidence,
			r["regime"], r["decision"],
			r["timing_ms"])
	}

	_ = math.Pi
	return results
}
