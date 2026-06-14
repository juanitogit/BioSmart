package pipeline

import (
	mathutil "gophermind_ai/internal/math"
)

// Perceive implements Phase 3: signal regime classification.
// Uses the SignalAnalyzer to classify the sensor window into one of
// five regimes that drive adaptive weight selection downstream.
//
// Regimes for vertical crops:
//   - STABLE:       Normal operation, trust all engines
//   - TRENDING:     Nutrient drift, CO₂ accumulation — boost Holt's method
//   - VOLATILE:     Ventilation cycles, irrigation events — conservative fusion
//   - NOISY:        Sensor interference (EC with bubbles) — suppress Taylor
//   - TRANSITIONAL: Light/dark cycle change — re-evaluate weights
func Perceive(ctx PipelineContext) PipelineContext {
	next := ctx
	vals := ctx.SeasonalAdjusted
	if len(vals) == 0 {
		vals = ctx.CleanValues
	}
	if len(vals) == 0 {
		vals = ctx.Values
	}

	profile := mathutil.AnalyzeSignal(vals)
	next.Regime = profile.Regime
	next.NoiseRatio = profile.NoiseRatio
	next.Stability = profile.Stability
	next.SignalProfile = profile

	return next
}
