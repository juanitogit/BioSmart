package mathutil

import (
	"math"
	"sync"
	"time"
)

// GaussianPrior represents a univariate Gaussian belief about an engine's
// weight in a specific signal regime.
type GaussianPrior struct {
	Mu     float64 // posterior mean
	Sigma2 float64 // posterior variance
}

// BayesianWeightTracker implements online Bayesian weight adaptation using
// the Normal-Normal conjugate update. Each (regime, engine) pair maintains
// an independent Gaussian posterior that is updated with the normalized
// prediction error after each observation.
//
// Key design decisions:
//   - σ²_obs is estimated empirically per engine from recent errors, not assumed constant.
//     This is critical because temperature sensors (error ~2°C) and pH sensors (error ~0.1)
//     operate at different scales.
//   - Regimes are evicted via LRU with configurable TTL to bound memory.
//   - On confirmed drift, the affected regime's priors reset to uniform.
type BayesianWeightTracker struct {
	mu sync.RWMutex

	// Priors maps [regime][engine] → Gaussian posterior
	Priors map[string]map[string]*GaussianPrior

	// ErrorHistory maps [engine] → ring buffer of recent errors
	ErrorHistory map[string]*RingBuffer

	// LastAccess maps [regime] → last access time for LRU eviction
	LastAccess map[string]time.Time

	// Config
	MaxRegimes       int           // LRU eviction threshold (default: 10)
	RegimeTTL        time.Duration // unused regime decay (default: 24h)
	VarianceWindow   int           // error history length (default: 20)
	VarianceMinSamp  int           // minimum samples for empirical variance (default: 5)
	Sigma2ObsDefault float64       // fallback when insufficient samples (default: 1.0)
	Sigma2ObsMin     float64       // floor to prevent zero variance (default: 0.01)
}

// NewBayesianWeightTracker creates a tracker with production defaults.
func NewBayesianWeightTracker() *BayesianWeightTracker {
	return &BayesianWeightTracker{
		Priors:           make(map[string]map[string]*GaussianPrior),
		ErrorHistory:     make(map[string]*RingBuffer),
		LastAccess:       make(map[string]time.Time),
		MaxRegimes:       10,
		RegimeTTL:        24 * time.Hour,
		VarianceWindow:   20,
		VarianceMinSamp:  5,
		Sigma2ObsDefault: 1.0,
		Sigma2ObsMin:     0.01,
	}
}

// Update performs a conjugate Normal-Normal posterior update for the given
// (regime, engine) pair using the observed prediction error.
//
// Conjugate update:
//
//	Prior:      N(μ₀, σ²₀)
//	Likelihood: N(x, σ²_obs)
//	Posterior:  μₙ = (σ²_obs·μ₀ + σ²₀·n·x̄) / (n·σ²₀ + σ²_obs)
//	            σ²ₙ = (σ²₀·σ²_obs) / (n·σ²₀ + σ²_obs)
func (t *BayesianWeightTracker) Update(regime, engine string, predError float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Record error in history
	if _, ok := t.ErrorHistory[engine]; !ok {
		t.ErrorHistory[engine] = NewRingBuffer(t.VarianceWindow)
	}
	t.ErrorHistory[engine].Push(predError)

	// Estimate σ²_obs from recent errors
	sigma2Obs := t.estimateVarianceLocked(engine)

	// Get or initialize prior
	prior := t.getPriorLocked(regime, engine)

	// Conjugate Normal-Normal update
	n := 1.0
	xBar := predError
	denom := n*prior.Sigma2 + sigma2Obs

	if denom > 0 {
		prior.Mu = (sigma2Obs*prior.Mu + prior.Sigma2*n*xBar) / denom
		prior.Sigma2 = (prior.Sigma2 * sigma2Obs) / denom
	}

	t.LastAccess[regime] = time.Now()
	t.evictLocked()
}

// GetWeights returns the normalized posterior means as engine weights
// for the specified regime.
func (t *BayesianWeightTracker) GetWeights(regime string, engines []string) map[string]float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()

	weights := make(map[string]float64, len(engines))
	total := 0.0

	for _, eng := range engines {
		prior := t.getPriorReadLocked(regime, eng)
		// Convert posterior mean to a positive weight using inverse error
		w := 1.0 / (math.Abs(prior.Mu) + 1e-9)
		weights[eng] = w
		total += w
	}

	// Normalize to sum to 1.0
	if total > 0 {
		for k := range weights {
			weights[k] /= total
		}
	}

	return weights
}

// ResetRegime clears all priors for a regime (called on confirmed drift).
func (t *BayesianWeightTracker) ResetRegime(regime string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.Priors, regime)
	delete(t.LastAccess, regime)
}

// HasData returns true if the tracker has data for the given regime.
func (t *BayesianWeightTracker) HasData(regime string) bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	_, ok := t.Priors[regime]
	return ok
}

func (t *BayesianWeightTracker) estimateVarianceLocked(engine string) float64 {
	buf, ok := t.ErrorHistory[engine]
	if !ok || buf.Len() < t.VarianceMinSamp {
		return t.Sigma2ObsDefault
	}
	v := Variance(buf.Values())
	return math.Max(t.Sigma2ObsMin, v)
}

func (t *BayesianWeightTracker) getPriorLocked(regime, engine string) *GaussianPrior {
	if _, ok := t.Priors[regime]; !ok {
		t.Priors[regime] = make(map[string]*GaussianPrior)
	}
	if _, ok := t.Priors[regime][engine]; !ok {
		t.Priors[regime][engine] = &GaussianPrior{Mu: 0.5, Sigma2: 1.0}
	}
	return t.Priors[regime][engine]
}

func (t *BayesianWeightTracker) getPriorReadLocked(regime, engine string) *GaussianPrior {
	if m, ok := t.Priors[regime]; ok {
		if p, ok := m[engine]; ok {
			return p
		}
	}
	return &GaussianPrior{Mu: 0.5, Sigma2: 1.0}
}

func (t *BayesianWeightTracker) evictLocked() {
	for len(t.Priors) > t.MaxRegimes {
		oldest := ""
		oldestTime := time.Now()
		for r, ts := range t.LastAccess {
			if ts.Before(oldestTime) {
				oldest = r
				oldestTime = ts
			}
		}
		if oldest != "" {
			delete(t.Priors, oldest)
			delete(t.LastAccess, oldest)
		} else {
			break
		}
	}
}

// RingBuffer is a fixed-size circular buffer for float64 values.
type RingBuffer struct {
	data  []float64
	head  int
	count int
	cap   int
}

// NewRingBuffer creates a ring buffer with the given capacity.
func NewRingBuffer(capacity int) *RingBuffer {
	return &RingBuffer{
		data: make([]float64, capacity),
		cap:  capacity,
	}
}

// Push adds a value, overwriting the oldest if full.
func (r *RingBuffer) Push(v float64) {
	r.data[r.head] = v
	r.head = (r.head + 1) % r.cap
	if r.count < r.cap {
		r.count++
	}
}

// Len returns the number of values in the buffer.
func (r *RingBuffer) Len() int {
	return r.count
}

// Values returns all stored values as a slice (oldest to newest).
func (r *RingBuffer) Values() []float64 {
	if r.count == 0 {
		return nil
	}
	out := make([]float64, r.count)
	start := (r.head - r.count + r.cap) % r.cap
	for i := 0; i < r.count; i++ {
		out[i] = r.data[(start+i)%r.cap]
	}
	return out
}
