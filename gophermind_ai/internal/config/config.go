// Package config provides environment-based configuration for the vertical
// crop monitoring system. All parameters are configurable at runtime via
// environment variables, following the Twelve-Factor App methodology.
package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func init() {
	// Load .env from the project root (two levels up from cmd/server/)
	// This allows the Go engine to share DATABASE_URL with the Node.js backend.
	candidates := []string{
		".env",
		"../../.env",
		"../.env",
	}
	for _, c := range candidates {
		abs, _ := filepath.Abs(c)
		if loadDotEnv(abs) {
			break
		}
	}
}

func loadDotEnv(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		// Don't overwrite already-set environment variables
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
	return true
}

// Config holds all pipeline configuration parameters.
type Config struct {
	// Pipeline budget
	PipelineBudgetMs int
	PredictTimeoutMs int
	PredictMaxWorkers int

	// Sanitize phase
	CUSUMKFactor float64 // k = kFactor * sigma (default 0.5)
	CUSUMHFactor float64 // h = hFactor * sigma (default 4.0)
	ClampSigma   float64 // ±N sigma clamping (default 6.0)

	// Hampel filter
	HampelEnabled bool
	HampelK       float64 // sensitivity multiplier (default 3.0)

	// Drift detection
	DriftEnabled        bool
	DriftDelta          float64
	DriftLambda         float64
	DriftAlpha          float64
	DriftCooldownSec    float64

	// Plasticity / Bayesian
	PlasticityEnabled   bool
	PlasticityMaxRegimes int
	PlasticityTTL       time.Duration

	// Decision engine
	DecisionEnabled         bool
	ThresholdEscalate       float64
	ThresholdInvestigate    float64
	ThresholdMonitor        float64
	AmpConsecutive5         float64
	AmpConsecutive3         float64
	AmpRateHigh             float64
	AmpVolatile             float64
	AmpDriftHigh            float64
	AttStable               float64
	AttLowCriticality       float64

	// Confidence calibration
	ConfCalibEnabled bool
	TempStable       float64
	TempTrending     float64
	TempVolatile     float64
	TempNoisy        float64

	// Compliance
	ComplianceExportPath string
	ComplianceHMACKey    string

	// Database (Neon DB via root .env)
	DatabaseURL    string
	HMACSecret     string
	BufferCapacity int

	// Server
	ServerPort string
}

// Load reads configuration from environment variables with safe defaults.
func Load() *Config {
	return &Config{
		PipelineBudgetMs:  envInt("VCA_PIPELINE_BUDGET_MS", 500),
		PredictTimeoutMs:  envInt("VCA_PREDICT_TIMEOUT_MS", 400),
		PredictMaxWorkers: envInt("VCA_PREDICT_MAX_WORKERS", 4),

		CUSUMKFactor: envFloat("VCA_CUSUM_K_FACTOR", 0.5),
		CUSUMHFactor: envFloat("VCA_CUSUM_H_FACTOR", 4.0),
		ClampSigma:   envFloat("VCA_CLAMP_SIGMA", 6.0),

		HampelEnabled: envBool("VCA_HAMPEL_ENABLED", true),
		HampelK:       envFloat("VCA_HAMPEL_K", 3.0),

		DriftEnabled:     envBool("VCA_DRIFT_ENABLED", true),
		DriftDelta:       envFloat("VCA_DRIFT_DELTA", 0.005),
		DriftLambda:      envFloat("VCA_DRIFT_LAMBDA", 50.0),
		DriftAlpha:       envFloat("VCA_DRIFT_ALPHA", 0.9999),
		DriftCooldownSec: envFloat("VCA_DRIFT_COOLDOWN_SEC", 300.0),

		PlasticityEnabled:    envBool("VCA_PLASTICITY_ENABLED", true),
		PlasticityMaxRegimes: envInt("VCA_PLASTICITY_MAX_REGIMES", 10),
		PlasticityTTL:        time.Duration(envInt("VCA_PLASTICITY_TTL_SEC", 86400)) * time.Second,

		DecisionEnabled:      envBool("VCA_DECISION_ENABLED", true),
		ThresholdEscalate:    envFloat("VCA_THRESHOLD_ESCALATE", 0.85),
		ThresholdInvestigate: envFloat("VCA_THRESHOLD_INVESTIGATE", 0.65),
		ThresholdMonitor:     envFloat("VCA_THRESHOLD_MONITOR", 0.40),
		AmpConsecutive5:      envFloat("VCA_AMP_CONSECUTIVE_5", 1.35),
		AmpConsecutive3:      envFloat("VCA_AMP_CONSECUTIVE_3", 1.20),
		AmpRateHigh:          envFloat("VCA_AMP_RATE_HIGH", 1.20),
		AmpVolatile:          envFloat("VCA_AMP_VOLATILE", 1.15),
		AmpDriftHigh:         envFloat("VCA_AMP_DRIFT_HIGH", 1.20),
		AttStable:            envFloat("VCA_ATT_STABLE", 0.85),
		AttLowCriticality:    envFloat("VCA_ATT_LOW_CRITICALITY", 0.80),

		ConfCalibEnabled: envBool("VCA_CONFIDENCE_CALIB_ENABLED", true),
		TempStable:       envFloat("VCA_TEMP_STABLE", 1.2),
		TempTrending:     envFloat("VCA_TEMP_TRENDING", 1.5),
		TempVolatile:     envFloat("VCA_TEMP_VOLATILE", 2.0),
		TempNoisy:        envFloat("VCA_TEMP_NOISY", 1.8),

		ComplianceExportPath: envStr("VCA_COMPLIANCE_EXPORT_PATH", "compliance_audit.ndjson"),
		ComplianceHMACKey:    envStr("VCA_COMPLIANCE_HMAC_KEY", ""),

		DatabaseURL:    envStr("DATABASE_URL", ""),
		HMACSecret:     envStr("HMAC_SECRET", envStr("JWT_SECRET", "")),
		BufferCapacity: envInt("VCA_BUFFER_CAPACITY", 10000),

		ServerPort: envStr("VCA_SERVER_PORT", "8090"),
	}
}

func envStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return def
}

func envBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return def
}
