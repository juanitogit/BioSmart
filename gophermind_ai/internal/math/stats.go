// Package mathutil provides pure mathematical algorithms for the cognitive
// pipeline. All functions are stateless or operate on explicit state structs,
// enabling deterministic testing and reproducibility required by IEEE standards.
package mathutil

import (
	"math"
	"sort"
)

// Mean computes the arithmetic mean of a float64 slice.
// Returns 0 for empty input.
func Mean(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range data {
		sum += v
	}
	return sum / float64(len(data))
}

// Variance computes the population variance of a float64 slice.
func Variance(data []float64) float64 {
	if len(data) < 2 {
		return 0
	}
	mu := Mean(data)
	sum := 0.0
	for _, v := range data {
		d := v - mu
		sum += d * d
	}
	return sum / float64(len(data))
}

// StdDev computes the population standard deviation.
func StdDev(data []float64) float64 {
	return math.Sqrt(Variance(data))
}

// Median returns the median value of a float64 slice.
// The input slice is not modified.
func Median(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}
	sorted := make([]float64, len(data))
	copy(sorted, data)
	sort.Float64s(sorted)
	n := len(sorted)
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}

// MAD computes the Median Absolute Deviation.
func MAD(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}
	med := Median(data)
	deviations := make([]float64, len(data))
	for i, v := range data {
		deviations[i] = math.Abs(v - med)
	}
	return Median(deviations)
}

// CoefficientOfVariation returns σ/|μ|, or 0 if μ is zero.
func CoefficientOfVariation(data []float64) float64 {
	mu := Mean(data)
	if mu == 0 {
		return 0
	}
	return StdDev(data) / math.Abs(mu)
}

// LinearSlope computes the slope of a least-squares linear fit.
// x values are assumed to be 0, 1, 2, ..., n-1 if not provided.
func LinearSlope(values []float64) float64 {
	n := float64(len(values))
	if n < 2 {
		return 0
	}
	sumX, sumY, sumXY, sumX2 := 0.0, 0.0, 0.0, 0.0
	for i, y := range values {
		x := float64(i)
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}
	denom := n*sumX2 - sumX*sumX
	if denom == 0 {
		return 0
	}
	return (n*sumXY - sumX*sumY) / denom
}

// Clamp restricts a value to the [lo, hi] range.
func Clamp(val, lo, hi float64) float64 {
	if val < lo {
		return lo
	}
	if val > hi {
		return hi
	}
	return val
}

// IsFinite returns true if the value is not NaN or ±Inf.
func IsFinite(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0)
}
