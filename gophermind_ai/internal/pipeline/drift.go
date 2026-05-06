package pipeline

import (
	"math"
)

// PageHinkleyDetector implements the Page-Hinkley drift detection test.
// It accumulates deviations from the reference mean with an exponential
// forgetting factor. When the accumulated deviation exceeds the threshold λ,
// concept drift is declared.
type PageHinkleyDetector struct {
	Delta   float64 // minimum detectable change magnitude (default: 0.005)
	Lambda  float64 // decision threshold (default: 50.0)
	Alpha   float64 // forgetting factor (default: 0.9999)
	Sum     float64 // accumulated deviations
	MinSum  float64 // minimum accumulated sum observed
	RefMean float64 // running reference mean
	Count   int
}

// NewPageHinkleyDetector creates a detector with production defaults.
func NewPageHinkleyDetector(delta, lambda, alpha float64) *PageHinkleyDetector {
	return &PageHinkleyDetector{
		Delta:  delta,
		Lambda: lambda,
		Alpha:  alpha,
	}
}

// Update processes a new observation and returns whether drift was detected.
func (d *PageHinkleyDetector) Update(x float64) (driftDetected bool, magnitude float64) {
	d.Count++
	d.RefMean = d.Alpha*d.RefMean + (1-d.Alpha)*x
	d.Sum += x - d.RefMean - d.Delta
	d.MinSum = math.Min(d.MinSum, d.Sum)

	magnitude = d.Sum - d.MinSum
	if magnitude > d.Lambda {
		driftDetected = true
		// Reset after detection
		d.Sum = 0
		d.MinSum = 0
	}
	return
}

// DriftDetection implements Phase 4: concept drift detection using
// Page-Hinkley on noise_ratio + stability as proxy signal.
// When drift is confirmed, the BayesianWeightTracker resets the
// affected regime to uniform priors.
func DriftDetection(ctx PipelineContext, detector *PageHinkleyDetector) PipelineContext {
	next := ctx
	if detector == nil {
		return next
	}

	// Use noise_ratio + stability as proxy for concept change
	// This avoids false drift from legitimate setpoint changes
	proxySignal := ctx.NoiseRatio + (1.0 - ctx.Stability)
	driftDetected, magnitude := detector.Update(proxySignal)

	next.DriftDetected = driftDetected
	next.DriftMagnitude = magnitude

	return next
}
