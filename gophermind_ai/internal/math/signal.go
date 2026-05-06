package mathutil

import (
	"math"
	"gophermind_ai/internal/entities"
)

// SignalProfile holds the complete analysis of a sensor signal window.
type SignalProfile struct {
	Regime     entities.RegimeType
	NoiseRatio float64
	Stability  float64
	ZScore     float64
	Slope      float64
	CoefVar    float64
}

// AnalyzeSignal classifies a sensor window into one of five signal regimes.
// Classification follows a priority cascade:
//
//  1. NOISY:        noise_ratio > 0.3 AND stability < 0.5
//  2. VOLATILE:     coefficient_of_variation > 0.25
//  3. TRANSITIONAL: recent regime change detected (slope inflection in last 20%)
//  4. TRENDING:     significant slope AND stability > 0.6
//  5. STABLE:       default when stability > 0.7
//
// For vertical crops, regime detection drives weight adaptation:
//   - STABLE → trust Taylor polynomial (clean derivatives)
//   - NOISY  → penalize Taylor, favor Statistical (EMA smoothing)
//   - TRENDING → boost Statistical Holt's method
func AnalyzeSignal(values []float64) SignalProfile {
	if len(values) < 3 {
		return SignalProfile{
			Regime:    entities.RegimeStable,
			Stability: 1.0,
		}
	}

	mu := Mean(values)
	sigma := StdDev(values)

	// Noise ratio: σ / |μ| (relative dispersion)
	noiseRatio := 0.0
	if math.Abs(mu) > 1e-12 {
		noiseRatio = sigma / math.Abs(mu)
	}

	// Stability: 1 - coefficient_of_variation (bounded to [0, 1])
	coefVar := CoefficientOfVariation(values)
	stability := Clamp(1.0-coefVar, 0, 1)

	// Z-score of the last value relative to the window
	zScore := 0.0
	if sigma > 1e-12 {
		lastVal := values[len(values)-1]
		zScore = math.Abs(lastVal-mu) / sigma
	}

	// Slope via linear regression
	slope := LinearSlope(values)

	// Regime classification (priority cascade)
	regime := classifyRegime(noiseRatio, stability, coefVar, slope, values)

	return SignalProfile{
		Regime:     regime,
		NoiseRatio: noiseRatio,
		Stability:  stability,
		ZScore:     zScore,
		Slope:      slope,
		CoefVar:    coefVar,
	}
}

func classifyRegime(noiseRatio, stability, coefVar, slope float64, values []float64) entities.RegimeType {
	// Priority 1: NOISY — high relative noise, low stability
	if noiseRatio > 0.3 && stability < 0.5 {
		return entities.RegimeNoisy
	}

	// Priority 2: VOLATILE — high coefficient of variation
	if coefVar > 0.25 {
		return entities.RegimeVolatile
	}

	// Priority 3: TRANSITIONAL — slope inflection in the tail
	if detectTransition(values) {
		return entities.RegimeTransitional
	}

	// Priority 4: TRENDING — significant persistent slope
	sigma := StdDev(values)
	slopeSignificance := 0.0
	if sigma > 1e-12 {
		slopeSignificance = math.Abs(slope) / sigma
	}
	if slopeSignificance > 0.1 && stability > 0.6 {
		return entities.RegimeTrending
	}

	// Priority 5: STABLE — default
	return entities.RegimeStable
}

// detectTransition checks if the signal's behavior changes in the last 20%
// of the window (slope sign reversal).
func detectTransition(values []float64) bool {
	n := len(values)
	if n < 10 {
		return false
	}
	splitPoint := n - n/5 // last 20%
	if splitPoint < 3 || n-splitPoint < 3 {
		return false
	}

	slopeHead := LinearSlope(values[:splitPoint])
	slopeTail := LinearSlope(values[splitPoint:])

	// Sign reversal indicates transition
	return (slopeHead > 0 && slopeTail < 0) || (slopeHead < 0 && slopeTail > 0)
}
