package mathutil

import "math"

// CUSUMDetector implements a two-sided Cumulative Sum (CUSUM) algorithm
// for detecting gradual ramps in sensor signals. This is essential for
// vertical crop monitoring where slow drifts in pH or EC indicate
// nutrient imbalances before they become critical.
//
// Reference: Page, E.S. (1954). "Continuous inspection schemes."
// Biometrika, 41(1/2), 100-115.
type CUSUMDetector struct {
	// K is the slack parameter (allowance). Typical: 0.5 * sigma.
	// Smaller values increase sensitivity to small shifts.
	K float64

	// H is the decision threshold. Typical: 4 * sigma.
	// Smaller values trigger alarms sooner but increase false positives.
	H float64

	// RefMean is the reference mean (target value under normal operation).
	RefMean float64

	// Splus accumulates positive deviations (ramp-up detection).
	Splus float64

	// Sminus accumulates negative deviations (ramp-down detection).
	Sminus float64

	// SampleCount tracks the number of observations processed.
	SampleCount int
}

// NewCUSUMDetector creates a detector calibrated from a reference window.
// k_factor and h_factor are multipliers of the estimated sigma:
//   - k = k_factor * sigma (default k_factor = 0.5)
//   - h = h_factor * sigma (default h_factor = 4.0)
func NewCUSUMDetector(refWindow []float64, kFactor, hFactor float64) *CUSUMDetector {
	mu := Mean(refWindow)
	sigma := StdDev(refWindow)
	if sigma < 1e-12 {
		sigma = 1e-12 // prevent zero division in perfectly flat signals
	}
	return &CUSUMDetector{
		K:       kFactor * sigma,
		H:       hFactor * sigma,
		RefMean: mu,
	}
}

// CUSUMResult holds the output of a single CUSUM update step.
type CUSUMResult struct {
	Flags   []string
	Splus   float64
	Sminus  float64
	IsAlarm bool
}

// Update processes a new observation and returns any alarm flags.
// The CUSUM statistics reset after an alarm to start fresh detection.
func (c *CUSUMDetector) Update(x float64) CUSUMResult {
	if !IsFinite(x) {
		return CUSUMResult{}
	}

	c.SampleCount++
	c.Splus = math.Max(0, c.Splus+(x-c.RefMean)-c.K)
	c.Sminus = math.Max(0, c.Sminus-(x-c.RefMean)-c.K)

	var flags []string
	alarm := false

	if c.Splus > c.H {
		flags = append(flags, "cusum_ramp_up")
		c.Splus = 0
		alarm = true
	}
	if c.Sminus > c.H {
		flags = append(flags, "cusum_ramp_down")
		c.Sminus = 0
		alarm = true
	}

	return CUSUMResult{
		Flags:   flags,
		Splus:   c.Splus,
		Sminus:  c.Sminus,
		IsAlarm: alarm,
	}
}

// Reset clears the accumulated statistics for a fresh detection cycle.
func (c *CUSUMDetector) Reset() {
	c.Splus = 0
	c.Sminus = 0
	c.SampleCount = 0
}
