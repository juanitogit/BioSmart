package engines

import (
	"context"
	"math"
	mathutil "gophermind_ai/internal/math"
)

// TaylorEngine fits a local polynomial to the time-series window using
// numerical derivatives, then projects the next point forward.
// Best for smooth, bounded signals (temperature, pressure in controlled environments).
type TaylorEngine struct {
	Order      int     // polynomial order (default: 3)
	ClampRange float64 // max prediction deviation as fraction of range (default: 0.20)
}

// NewTaylorEngine creates a TaylorEngine with production defaults.
func NewTaylorEngine() *TaylorEngine {
	return &TaylorEngine{Order: 3, ClampRange: 0.20}
}

func (e *TaylorEngine) Name() string         { return "taylor_polynomial" }
func (e *TaylorEngine) CanHandle(n int) bool  { return n >= 3 }

func (e *TaylorEngine) Predict(ctx context.Context, values, timestamps []float64) EngineOutput {
	n := len(values)
	if n < 3 {
		return EngineOutput{Err: ErrInsufficientData}
	}

	// Check context deadline
	select {
	case <-ctx.Done():
		return EngineOutput{Err: ctx.Err()}
	default:
	}

	// Compute time step (dt)
	dt := 1.0
	if len(timestamps) >= 2 {
		dt = timestamps[n-1] - timestamps[n-2]
		if dt <= 0 {
			dt = 1.0
		}
	}

	// Compute derivatives via backward differences
	d0 := values[n-1]                              // f(t)
	d1 := (values[n-1] - values[n-2]) / dt         // f'(t)
	d2 := 0.0
	if n >= 3 {
		d2 = (values[n-1] - 2*values[n-2] + values[n-3]) / (dt * dt) // f''(t)
	}

	// Taylor projection: f(t+h) ≈ f(t) + f'(t)·h + f''(t)·h²/2
	h := dt // project one step forward
	predicted := d0 + d1*h + d2*h*h/2.0

	// Clamp to ±20% of value range
	minVal, maxVal := values[0], values[0]
	for _, v := range values {
		if v < minVal { minVal = v }
		if v > maxVal { maxVal = v }
	}
	valRange := maxVal - minVal
	if valRange > 0 {
		lo := minVal - e.ClampRange*valRange
		hi := maxVal + e.ClampRange*valRange
		predicted = mathutil.Clamp(predicted, lo, hi)
	}

	// Confidence from fit residuals
	sigma := mathutil.StdDev(values)
	fitError := math.Abs(d1 * dt)
	confidence := 1.0
	if sigma > 1e-12 {
		confidence = mathutil.Clamp(1.0-fitError/sigma, 0.2, 0.95)
	}

	// Trend classification
	trend := "stable"
	if d1 > 0.01*sigma { trend = "up" }
	if d1 < -0.01*sigma { trend = "down" }

	return EngineOutput{
		PredictedValue: predicted,
		Confidence:     confidence,
		Trend:          trend,
		Metadata: map[string]interface{}{
			"engine": "taylor_polynomial",
			"order":  e.Order,
			"d0": d0, "d1": d1, "d2": d2,
			"dt": dt,
		},
	}
}
