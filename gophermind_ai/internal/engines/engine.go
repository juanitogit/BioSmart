// Package engines defines the prediction engine interface and concrete
// implementations for time-series forecasting in vertical crop environments.
package engines

import "context"

// PredictionEngine is the interface that all prediction engines must implement.
// Engines are executed concurrently with a strict timeout budget.
type PredictionEngine interface {
	// Name returns the unique identifier for this engine.
	Name() string

	// CanHandle returns true if the engine can process a window of n points.
	CanHandle(nPoints int) bool

	// Predict generates a forecast from the given sensor window.
	// The context carries the per-engine timeout deadline.
	Predict(ctx context.Context, values, timestamps []float64) EngineOutput
}

// EngineOutput is the raw output from a prediction engine.
type EngineOutput struct {
	PredictedValue float64
	Confidence     float64
	Trend          string
	Metadata       map[string]interface{}
	Err            error
}
