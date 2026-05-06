// Package pipeline implements the 15-phase cognitive pipeline for vertical
// crop monitoring. Each phase is a pure function that transforms an immutable
// PipelineContext, enabling deterministic testing and safe concurrency.
package pipeline

import (
	"time"
	"gophermind_ai/internal/entities"
	mathutil "gophermind_ai/internal/math"
)

// PipelineContext carries all state between pipeline phases.
// It is passed by value (copy-on-write) between phases to guarantee
// immutability and eliminate race conditions in concurrent execution.
type PipelineContext struct {
	// Input
	SeriesID   string
	Values     []float64
	Timestamps []float64

	// Phase 0: Sanitize
	SanitizationFlags []string
	IsFallback        bool
	FallbackReason    string
	CleanValues       []float64

	// Phase 1: BoundaryCheck
	BoundaryViolation bool

	// Phase 2: SeasonalDecomposition
	SeasonalAdjusted []float64

	// Phase 3: Perceive
	Regime     entities.RegimeType
	NoiseRatio float64
	Stability  float64

	// Phase 4: DriftDetection
	DriftDetected   bool
	DriftMagnitude  float64

	// Phase 5: Predict
	Perceptions    []entities.EnginePerception
	EngineFailures []entities.EngineFailure

	// Phase 6: Adapt
	ResolvedWeights map[string]float64

	// Phase 7: Inhibit
	InhibitedPerceptions []entities.EnginePerception

	// Phase 8: Fuse
	FusedValue  float64
	Confidence  float64
	Trend       string
	FusionFlags []string
	HampelDiag  *entities.HampelDiag

	// Phase 9: DecisionArbiter
	Decision entities.Decision

	// Phase 10: CoherenceCheck
	CoherenceVerdict string

	// Phase 11: ConfidenceCalibration
	CalibratedConfidence float64

	// Phase 12: Explain
	Explanation map[string]interface{}
	Narrative   []string

	// Phase 13: ActionGuard
	GuardedAction entities.GuardVerdict
	ActionReason  string

	// Phase 14: NarrativeUnification
	UnifiedNarrative string

	// Timing
	Timing *entities.PipelineTiming

	// Signal profile (from Perceive)
	SignalProfile mathutil.SignalProfile
}

// PhaseTimer tracks execution time per phase.
type PhaseTimer struct {
	start   time.Time
	Timing  entities.PipelineTiming
}

// NewPhaseTimer starts a new timer.
func NewPhaseTimer() *PhaseTimer {
	return &PhaseTimer{start: time.Now()}
}

// Record stores the elapsed time for the named phase.
func (t *PhaseTimer) Record(phase string) float64 {
	elapsed := float64(time.Since(t.start).Microseconds()) / 1000.0
	switch phase {
	case "sanitize":
		t.Timing.SanitizeMs = elapsed
	case "perceive":
		t.Timing.PerceiveMs = elapsed
	case "predict":
		t.Timing.PredictMs = elapsed
	case "adapt":
		t.Timing.AdaptMs = elapsed
	case "inhibit":
		t.Timing.InhibitMs = elapsed
	case "fuse":
		t.Timing.FuseMs = elapsed
	case "decision":
		t.Timing.DecisionMs = elapsed
	case "explain":
		t.Timing.ExplainMs = elapsed
	}
	t.start = time.Now()
	return elapsed
}

// Total returns the total elapsed time.
func (t *PhaseTimer) Total() float64 {
	t.Timing.TotalMs = t.Timing.SanitizeMs + t.Timing.PerceiveMs +
		t.Timing.PredictMs + t.Timing.AdaptMs + t.Timing.InhibitMs +
		t.Timing.FuseMs + t.Timing.DecisionMs + t.Timing.ExplainMs
	return t.Timing.TotalMs
}
