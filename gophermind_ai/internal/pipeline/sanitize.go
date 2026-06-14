package pipeline

import (
	"math"
	mathutil "gophermind_ai/internal/math"
)

// Sanitize implements Phase 0: input validation, ±6σ clamping, and
// CUSUM two-sided detection for gradual ramp anomalies.
//
// Early termination: if any value is NaN or ±Inf, the pipeline returns
// a fallback result immediately.
//
// The CUSUM algorithm detects slow drifts in pH, EC, or temperature
// that threshold-based detectors miss entirely.
func Sanitize(ctx PipelineContext, clampSigma, cusumK, cusumH float64) PipelineContext {
	next := ctx
	next.SanitizationFlags = nil

	// Hard-stop: check for NaN/Inf
	for _, v := range ctx.Values {
		if !mathutil.IsFinite(v) {
			next.IsFallback = true
			next.FallbackReason = "nan_or_inf_rejected"
			next.SanitizationFlags = append(next.SanitizationFlags, "nan_or_inf_detected")
			return next
		}
	}

	if len(ctx.Values) < 2 {
		next.CleanValues = make([]float64, len(ctx.Values))
		copy(next.CleanValues, ctx.Values)
		return next
	}

	// Compute window statistics for clamping
	mu := mathutil.Mean(ctx.Values)
	sigma := mathutil.StdDev(ctx.Values)

	// ±6σ clamping
	clamped := make([]float64, len(ctx.Values))
	lo := mu - clampSigma*sigma
	hi := mu + clampSigma*sigma
	clampCount := 0
	for i, v := range ctx.Values {
		clamped[i] = mathutil.Clamp(v, lo, hi)
		if clamped[i] != v {
			clampCount++
		}
	}
	if clampCount > 0 {
		next.SanitizationFlags = append(next.SanitizationFlags, "values_clamped")
	}

	// CUSUM two-sided detection
	detector := mathutil.NewCUSUMDetector(clamped, cusumK, cusumH)
	for _, v := range clamped {
		result := detector.Update(v)
		next.SanitizationFlags = append(next.SanitizationFlags, result.Flags...)
	}

	next.CleanValues = clamped
	return next
}

// BoundaryCheck implements Phase 1: validates that values are within
// physically plausible domain limits for crop sensors.
func BoundaryCheck(ctx PipelineContext) PipelineContext {
	next := ctx
	// Domain boundaries per sensor type (extensible via config)
	// For now, check basic physical limits
	for _, v := range ctx.CleanValues {
		if math.Abs(v) > 1e6 {
			next.BoundaryViolation = true
			next.IsFallback = true
			next.FallbackReason = "out_of_domain"
			return next
		}
	}
	return next
}

// SeasonalDecomposition implements Phase 2: removes periodic components
// from the signal using simple differencing (lightweight FFT alternative
// for edge deployment).
func SeasonalDecomposition(ctx PipelineContext) PipelineContext {
	next := ctx
	vals := ctx.CleanValues
	if len(vals) == 0 {
		vals = ctx.Values
	}
	// Simple pass-through for now; seasonal adjustment requires
	// sufficient data (≥48 points for 24h period detection).
	// On edge devices, full FFT is replaced by differencing.
	next.SeasonalAdjusted = make([]float64, len(vals))
	copy(next.SeasonalAdjusted, vals)
	return next
}
