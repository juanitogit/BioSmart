// Package entities defines the core domain types for the vertical crop
// monitoring system. All structs are designed as immutable value objects
// following IEEE 802.1 traceability standards for precision agriculture.
package entities

import "time"

// RegimeType classifies the signal behavior detected in a sensor window.
// The classification drives adaptive weight selection in the Bayesian tracker.
type RegimeType string

const (
	RegimeStable       RegimeType = "STABLE"
	RegimeTrending     RegimeType = "TRENDING"
	RegimeVolatile     RegimeType = "VOLATILE"
	RegimeNoisy        RegimeType = "NOISY"
	RegimeTransitional RegimeType = "TRANSITIONAL"
)

// SensorType enumerates the physical magnitudes measured in a vertical farm.
type SensorType string

const (
	SensorTemperature SensorType = "temperature"
	SensorHumidity    SensorType = "humidity"
	SensorCO2         SensorType = "co2"
	SensorPH          SensorType = "ph"
	SensorEC          SensorType = "ec"
	SensorLight       SensorType = "light"
	SensorWaterFlow   SensorType = "water_flow"
)

// SensorReading represents a single data point from an IoT sensor
// deployed in a vertical crop rack.
type SensorReading struct {
	SeriesID   string     `json:"series_id"`
	Value      float64    `json:"value"`
	Timestamp  time.Time  `json:"timestamp"`
	SensorType SensorType `json:"sensor_type"`
	Unit       string     `json:"unit"`
	ZoneID     string     `json:"zone_id"`
	RackID     string     `json:"rack_id"`
	Quality    float64    `json:"quality"`
}

// SensorWindow holds a sliding window of readings for pipeline processing.
// Values and Timestamps are parallel slices of equal length.
type SensorWindow struct {
	SeriesID   string
	Values     []float64
	Timestamps []float64 // epoch seconds (float64 for sub-second precision)
}

// Len returns the number of data points in the window.
func (w *SensorWindow) Len() int {
	return len(w.Values)
}

// LastValue returns the most recent value in the window, or 0 if empty.
func (w *SensorWindow) LastValue() float64 {
	if len(w.Values) == 0 {
		return 0
	}
	return w.Values[len(w.Values)-1]
}
