package mathutil

import "math"

// HampelResult contains the output of the Hampel outlier filter.
type HampelResult struct {
	Filtered      []float64
	RejectedIdx   []int
	MADValue      float64
	Threshold     float64
	RejectedCount int
}

// HampelFilter applies a Hampel identifier to reject outlier predictions
// from the engine ensemble before weighted fusion. Uses the Median Absolute
// Deviation (MAD) as a robust scale estimator.
//
// The consistency constant 1.4826 makes MAD an unbiased estimator of σ
// for normally distributed data: MAD × 1.4826 ≈ σ.
//
// Parameters:
//   - values: prediction values from each engine
//   - k: sensitivity multiplier (default 3.0, equivalent to ~3σ for Gaussian)
//
// Bypass conditions (returns all values unfiltered):
//   - fewer than 3 values (insufficient for robust statistics)
//   - MAD = 0 (all predictions identical)
//
// Reference: Hampel, F.R. (1974). "The Influence Curve and its Role in
// Robust Estimation." JASA, 69(346), 383-393.
func HampelFilter(values []float64, k float64) HampelResult {
	n := len(values)

	// Bypass: insufficient data for robust statistics
	if n < 3 {
		return HampelResult{Filtered: values}
	}

	med := Median(values)

	deviations := make([]float64, n)
	for i, v := range values {
		deviations[i] = math.Abs(v - med)
	}
	mad := Median(deviations)

	// Bypass: all predictions identical (MAD = 0)
	if mad == 0 {
		return HampelResult{
			Filtered: values,
			MADValue: 0,
		}
	}

	// Consistency constant for Gaussian distribution
	const consistencyFactor = 1.4826
	threshold := k * consistencyFactor * mad

	var filtered []float64
	var rejected []int

	for i, v := range values {
		if math.Abs(v-med) <= threshold {
			filtered = append(filtered, v)
		} else {
			rejected = append(rejected, i)
		}
	}

	// Safety: if all would be rejected, return original
	if len(filtered) == 0 {
		return HampelResult{
			Filtered:  values,
			MADValue:  mad,
			Threshold: threshold,
		}
	}

	return HampelResult{
		Filtered:      filtered,
		RejectedIdx:   rejected,
		MADValue:      mad,
		Threshold:     threshold,
		RejectedCount: len(rejected),
	}
}
