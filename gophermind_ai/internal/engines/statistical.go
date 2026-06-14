package engines

import (
	"context"
	"math"
	mathutil "gophermind_ai/internal/math"
)

// StatisticalEngine implements double exponential smoothing (Holt's method)
// for trend-following prediction. Best for noisy signals with persistent trends.
type StatisticalEngine struct {
	Alpha float64 // level smoothing factor (default: 0.3)
	Beta  float64 // trend smoothing factor (default: 0.1)
}

// NewStatisticalEngine creates an engine with production defaults.
func NewStatisticalEngine() *StatisticalEngine {
	return &StatisticalEngine{Alpha: 0.3, Beta: 0.1}
}

func (e *StatisticalEngine) Name() string         { return "statistical_holt" }
func (e *StatisticalEngine) CanHandle(n int) bool  { return n >= 3 }

func (e *StatisticalEngine) Predict(ctx context.Context, values, timestamps []float64) EngineOutput {
	n := len(values)
	if n < 3 {
		return EngineOutput{Err: ErrInsufficientData}
	}

	select {
	case <-ctx.Done():
		return EngineOutput{Err: ctx.Err()}
	default:
	}

	// Initialize level and trend
	level := values[0]
	trend := values[1] - values[0]

	// Holt's double exponential smoothing
	residuals := make([]float64, 0, n)
	for i := 1; i < n; i++ {
		prevLevel := level
		level = e.Alpha*values[i] + (1-e.Alpha)*(level+trend)
		trend = e.Beta*(level-prevLevel) + (1-e.Beta)*trend

		predicted := prevLevel + trend
		residuals = append(residuals, math.Abs(values[i]-predicted))
	}

	// Project one step ahead
	predicted := level + trend

	// Confidence from residual noise ratio
	residualStd := mathutil.StdDev(residuals)
	sigma := mathutil.StdDev(values)
	noiseRatio := 0.0
	if sigma > 1e-12 {
		noiseRatio = residualStd / sigma
	}
	confidence := mathutil.Clamp(1.0-noiseRatio, 0.2, 0.95)

	// Trend classification
	trendStr := "stable"
	if sigma > 1e-12 {
		relTrend := trend / sigma
		if relTrend > 0.05 { trendStr = "up" }
		if relTrend < -0.05 { trendStr = "down" }
	}

	return EngineOutput{
		PredictedValue: predicted,
		Confidence:     confidence,
		Trend:          trendStr,
		Metadata: map[string]interface{}{
			"engine":       "statistical_holt",
			"level":        level,
			"trend":        trend,
			"alpha":        e.Alpha,
			"beta":         e.Beta,
			"residual_std": residualStd,
		},
	}
}
