package engines

import (
	"context"
	"errors"
	"math"
	mathutil "gophermind_ai/internal/math"
)

// ErrInsufficientData is returned when a window has too few points.
var ErrInsufficientData = errors.New("insufficient data points")

// BaselineEngine computes a simple moving average. It is the engine of last
// resort — it never fails and always provides a stable anchor prediction.
type BaselineEngine struct {
	WindowSize int // max points to average (default: 20)
}

// NewBaselineEngine creates a baseline engine with production defaults.
func NewBaselineEngine() *BaselineEngine {
	return &BaselineEngine{WindowSize: 20}
}

func (e *BaselineEngine) Name() string         { return "baseline_moving_avg" }
func (e *BaselineEngine) CanHandle(_ int) bool { return true } // always handles

func (e *BaselineEngine) Predict(_ context.Context, values, _ []float64) EngineOutput {
	if len(values) == 0 {
		return EngineOutput{
			PredictedValue: 0,
			Confidence:     0.1,
			Trend:          "unknown",
		}
	}

	// Use last N values
	start := len(values) - e.WindowSize
	if start < 0 {
		start = 0
	}
	window := values[start:]

	predicted := mathutil.Mean(window)
	sigma := mathutil.StdDev(window)

	// Confidence inversely proportional to relative variance
	confidence := 0.5
	if math.Abs(predicted) > 1e-12 {
		relVar := sigma / math.Abs(predicted)
		confidence = mathutil.Clamp(1.0-relVar, 0.2, 0.70) // capped at 0.70 (humble)
	}

	return EngineOutput{
		PredictedValue: predicted,
		Confidence:     confidence,
		Trend:          "stable",
		Metadata: map[string]interface{}{
			"engine": "baseline_moving_avg",
			"window": len(window),
		},
	}
}
