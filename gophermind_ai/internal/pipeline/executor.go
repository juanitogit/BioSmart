package pipeline

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"gophermind_ai/internal/config"
	"gophermind_ai/internal/engines"
	"gophermind_ai/internal/entities"
	mathutil "gophermind_ai/internal/math"
)

// Executor orchestrates the 15-phase cognitive pipeline.
// It holds shared mutable state (BayesianWeightTracker, drift detectors)
// and dispatches immutable PipelineContext through each phase.
type Executor struct {
	cfg      *config.Config
	engines  []engines.PredictionEngine
	tracker  *mathutil.BayesianWeightTracker
	drifters map[string]*PageHinkleyDetector // per-series drift detectors
	dmu      sync.Mutex

	// Compliance
	complianceMu   sync.Mutex
	complianceFile *os.File
}

// NewExecutor creates a pipeline executor with the given configuration.
func NewExecutor(cfg *config.Config) *Executor {
	return &Executor{
		cfg: cfg,
		engines: []engines.PredictionEngine{
			engines.NewTaylorEngine(),
			engines.NewStatisticalEngine(),
			engines.NewBaselineEngine(),
		},
		tracker:  mathutil.NewBayesianWeightTracker(),
		drifters: make(map[string]*PageHinkleyDetector),
	}
}

// Execute runs the full 15-phase pipeline for a sensor window.
// Each phase receives an immutable context and returns a new one.
func (e *Executor) Execute(window *entities.SensorWindow) (*entities.PredictionResult, *entities.ComplianceRecord) {
	timer := NewPhaseTimer()

	// Initialize context
	ctx := PipelineContext{
		SeriesID:   window.SeriesID,
		Values:     window.Values,
		Timestamps: window.Timestamps,
	}

	// === Phase 0: Sanitize ===
	ctx = Sanitize(ctx, e.cfg.ClampSigma, e.cfg.CUSUMKFactor, e.cfg.CUSUMHFactor)
	timer.Record("sanitize")
	if ctx.IsFallback {
		return e.buildFallbackResult(ctx, timer), nil
	}

	// === Phase 1: BoundaryCheck ===
	ctx = BoundaryCheck(ctx)
	if ctx.IsFallback {
		return e.buildFallbackResult(ctx, timer), nil
	}

	// === Phase 2: SeasonalDecomposition ===
	ctx = SeasonalDecomposition(ctx)

	// === Phase 3: Perceive ===
	ctx = Perceive(ctx)
	timer.Record("perceive")

	// === Phase 4: DriftDetection ===
	if e.cfg.DriftEnabled {
		detector := e.getOrCreateDriftDetector(window.SeriesID)
		ctx = DriftDetection(ctx, detector)

		// Reset Bayesian tracker on drift
		if ctx.DriftDetected && e.tracker != nil {
			e.tracker.ResetRegime(string(ctx.Regime))
			log.Printf("[DRIFT] Series=%s regime=%s magnitude=%.4f — weights reset",
				window.SeriesID, ctx.Regime, ctx.DriftMagnitude)
		}
	}

	// === Phase 5: Predict (concurrent goroutines) ===
	ctx = Predict(ctx, e.engines, e.cfg.PredictTimeoutMs)
	timer.Record("predict")

	// === Phase 6: Adapt ===
	if e.cfg.PlasticityEnabled {
		ctx = Adapt(ctx, e.tracker)
	} else {
		ctx = Adapt(ctx, nil) // uniform weights
	}
	timer.Record("adapt")

	// === Phase 7: Inhibit ===
	ctx = Inhibit(ctx)
	timer.Record("inhibit")

	// === Phase 8: Fuse ===
	ctx = Fuse(ctx, e.cfg.HampelK, e.cfg.HampelEnabled)
	timer.Record("fuse")

	// === Phase 9: DecisionArbiter ===
	if e.cfg.DecisionEnabled {
		dCfg := DecisionConfig{
			ThresholdEscalate:    e.cfg.ThresholdEscalate,
			ThresholdInvestigate: e.cfg.ThresholdInvestigate,
			ThresholdMonitor:     e.cfg.ThresholdMonitor,
			AmpConsecutive5:      e.cfg.AmpConsecutive5,
			AmpConsecutive3:      e.cfg.AmpConsecutive3,
			AmpRateHigh:          e.cfg.AmpRateHigh,
			AmpVolatile:          e.cfg.AmpVolatile,
			AmpDriftHigh:         e.cfg.AmpDriftHigh,
			AttStable:            e.cfg.AttStable,
			AttLowCriticality:    e.cfg.AttLowCriticality,
		}
		ctx = DecisionArbiter(ctx, dCfg)
	}
	timer.Record("decision")

	// === Phase 10: CoherenceCheck ===
	ctx = CoherenceCheck(ctx)

	// === Phase 11: ConfidenceCalibration ===
	if e.cfg.ConfCalibEnabled {
		temps := map[entities.RegimeType]float64{
			entities.RegimeStable:   e.cfg.TempStable,
			entities.RegimeTrending: e.cfg.TempTrending,
			entities.RegimeVolatile: e.cfg.TempVolatile,
			entities.RegimeNoisy:    e.cfg.TempNoisy,
		}
		ctx = ConfidenceCalibration(ctx, temps)
	} else {
		ctx.CalibratedConfidence = ctx.Confidence
	}

	// === Phase 12: Explain ===
	ctx = Explain(ctx)
	timer.Record("explain")

	// === Phase 13: ActionGuard ===
	ctx = ActionGuard(ctx)

	// === Phase 14: NarrativeUnification ===
	ctx = NarrativeUnification(ctx)

	timer.Total()
	timing := timer.Timing

	// === Assembly: build results ===
	result := &entities.PredictionResult{
		PredictedValue: &ctx.FusedValue,
		Confidence:     ctx.CalibratedConfidence,
		Trend:          ctx.Trend,
		Metadata: map[string]interface{}{
			"regime":            string(ctx.Regime),
			"decision":          string(ctx.Decision.Action),
			"score":             ctx.Decision.Score,
			"guard":             string(ctx.GuardedAction),
			"narrative":         ctx.UnifiedNarrative,
			"drift_detected":    ctx.DriftDetected,
			"engines_count":     len(ctx.Perceptions),
			"failures_count":    len(ctx.EngineFailures),
			"pipeline_total_ms": timing.TotalMs,
		},
	}

	// Build compliance record
	record := &entities.ComplianceRecord{
		SchemaVersion:     "1.0",
		RecordID:          generateUUID(),
		CreatedAt:         time.Now().UTC().Format("2006-01-02T15:04:05.000000Z"),
		SeriesID:          window.SeriesID,
		Outcome:           entities.PredictionOutcome{
			PredictedValue: &ctx.FusedValue,
			Confidence:     ctx.CalibratedConfidence,
			Trend:          ctx.Trend,
		},
		SanitizationFlags: ctx.SanitizationFlags,
		FusionFlags:       ctx.FusionFlags,
		EngineFailures:    ctx.EngineFailures,
		Hampel:            ctx.HampelDiag,
		PipelineTiming:    &timing,
	}

	// Sign record with HMAC
	if e.cfg.ComplianceHMACKey != "" {
		if err := record.Sign([]byte(e.cfg.ComplianceHMACKey)); err != nil {
			log.Printf("[COMPLIANCE] HMAC signing error: %v", err)
		}
	}

	// Update Bayesian tracker with actual results (for learning)
	if e.cfg.PlasticityEnabled && e.tracker != nil {
		for _, p := range ctx.Perceptions {
			predError := p.PredictedValue - ctx.FusedValue
			e.tracker.Update(string(ctx.Regime), p.EngineName, predError)
		}
	}

	return result, record
}

func (e *Executor) buildFallbackResult(ctx PipelineContext, timer *PhaseTimer) *entities.PredictionResult {
	timer.Total()
	return &entities.PredictionResult{
		Confidence:     0.0,
		Trend:          "unknown",
		IsFallback:     true,
		FallbackReason: ctx.FallbackReason,
		Metadata: map[string]interface{}{
			"sanitization_flags": ctx.SanitizationFlags,
			"pipeline_total_ms":  timer.Timing.TotalMs,
		},
	}
}

func (e *Executor) getOrCreateDriftDetector(seriesID string) *PageHinkleyDetector {
	e.dmu.Lock()
	defer e.dmu.Unlock()

	if d, ok := e.drifters[seriesID]; ok {
		return d
	}
	d := NewPageHinkleyDetector(e.cfg.DriftDelta, e.cfg.DriftLambda, e.cfg.DriftAlpha)
	e.drifters[seriesID] = d
	return d
}

func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant RFC4122
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hex.EncodeToString(b[0:4]),
		hex.EncodeToString(b[4:6]),
		hex.EncodeToString(b[6:8]),
		hex.EncodeToString(b[8:10]),
		hex.EncodeToString(b[10:16]))
}
