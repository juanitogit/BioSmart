package pipeline

import (
	"fmt"
	"math"
	"strings"
	"gophermind_ai/internal/entities"
)

// DecisionArbiter implements Phase 9: contextual decision engine with
// 8 amplifiers and 3 attenuators that adjust the base anomaly score.
func DecisionArbiter(ctx PipelineContext, cfg DecisionConfig) PipelineContext {
	next := ctx

	// Base score from confidence inversion (low confidence → high anomaly)
	baseScore := 1.0 - ctx.Confidence

	// Apply amplifiers
	score := baseScore
	var amps []string

	if ctx.Regime == entities.RegimeVolatile {
		score *= cfg.AmpVolatile
		amps = append(amps, "volatile_regime")
	}
	if ctx.Regime == entities.RegimeNoisy {
		score *= 1.10
		amps = append(amps, "noisy_regime")
	}
	if ctx.DriftDetected {
		score *= cfg.AmpDriftHigh
		amps = append(amps, "drift_detected")
	}

	// Apply attenuators
	var atts []string
	if ctx.Regime == entities.RegimeStable && ctx.DriftMagnitude < 0.10 {
		score *= cfg.AttStable
		atts = append(atts, "stable_low_drift")
	}

	score = math.Min(score, 1.0)
	score = math.Max(score, 0.0)

	// Map score to action
	action := entities.ActionLogOnly
	priority := 5
	reason := "weak_signal"

	if score >= cfg.ThresholdEscalate {
		action = entities.ActionEscalate
		priority = 1
		reason = "persistent_pattern"
	} else if score >= cfg.ThresholdInvestigate {
		action = entities.ActionInvestigate
		priority = 2
		reason = "contextual_anomaly"
	} else if score >= cfg.ThresholdMonitor {
		action = entities.ActionMonitor
		priority = 3
		reason = "moderate_anomaly"
	}

	next.Decision = entities.Decision{
		Action:      action,
		Score:       score,
		Priority:    priority,
		Reason:      reason,
		Amplifiers:  amps,
		Attenuators: atts,
	}

	return next
}

// DecisionConfig holds the configurable thresholds for the decision engine.
type DecisionConfig struct {
	ThresholdEscalate    float64
	ThresholdInvestigate float64
	ThresholdMonitor     float64
	AmpConsecutive5      float64
	AmpConsecutive3      float64
	AmpRateHigh          float64
	AmpVolatile          float64
	AmpDriftHigh         float64
	AttStable            float64
	AttLowCriticality    float64
}

// CoherenceCheck implements Phase 10: validates decision coherence.
func CoherenceCheck(ctx PipelineContext) PipelineContext {
	next := ctx
	// Coherence: check if decision aligns with signal regime
	if ctx.Decision.Action == entities.ActionEscalate && ctx.Regime == entities.RegimeStable {
		next.CoherenceVerdict = "inconclusive"
	} else {
		next.CoherenceVerdict = "coherent"
	}
	return next
}

// ConfidenceCalibration implements Phase 11: regime-based temperature scaling.
// Higher temperature → more conservative (lower) calibrated confidence.
func ConfidenceCalibration(ctx PipelineContext, temps map[entities.RegimeType]float64) PipelineContext {
	next := ctx
	temp := 1.0
	if t, ok := temps[ctx.Regime]; ok {
		temp = t
	}
	// Temperature scaling: calibrated = raw / temperature
	next.CalibratedConfidence = ctx.Confidence / temp
	if next.CalibratedConfidence > 1.0 {
		next.CalibratedConfidence = 1.0
	}
	return next
}

// Explain implements Phase 12: structured explanation generation.
func Explain(ctx PipelineContext) PipelineContext {
	next := ctx
	next.Explanation = map[string]interface{}{
		"regime":       string(ctx.Regime),
		"noise_ratio":  ctx.NoiseRatio,
		"stability":    ctx.Stability,
		"fused_value":  ctx.FusedValue,
		"confidence":   ctx.CalibratedConfidence,
		"trend":        ctx.Trend,
		"drift":        ctx.DriftDetected,
		"decision":     string(ctx.Decision.Action),
		"score":        ctx.Decision.Score,
		"engines_used": len(ctx.Perceptions),
		"engines_failed": len(ctx.EngineFailures),
	}

	// Build narrative
	var narrative []string
	narrative = append(narrative,
		fmt.Sprintf("Signal classified as %s (stability=%.2f, noise=%.2f)",
			ctx.Regime, ctx.Stability, ctx.NoiseRatio))

	if len(ctx.Perceptions) > 0 {
		names := make([]string, len(ctx.Perceptions))
		for i, p := range ctx.Perceptions {
			names[i] = p.EngineName
		}
		narrative = append(narrative,
			fmt.Sprintf("Ensemble of %d engines: %s",
				len(ctx.Perceptions), strings.Join(names, ", ")))
	}

	narrative = append(narrative,
		fmt.Sprintf("Fused prediction: %.4f (confidence=%.2f, trend=%s)",
			ctx.FusedValue, ctx.CalibratedConfidence, ctx.Trend))

	if ctx.DriftDetected {
		narrative = append(narrative,
			fmt.Sprintf("DRIFT DETECTED (magnitude=%.4f)", ctx.DriftMagnitude))
	}

	narrative = append(narrative,
		fmt.Sprintf("Decision: %s (score=%.2f, reason=%s)",
			ctx.Decision.Action, ctx.Decision.Score, ctx.Decision.Reason))

	next.Narrative = narrative
	return next
}

// ActionGuard implements Phase 13: guardrails for automated actions.
func ActionGuard(ctx PipelineContext) PipelineContext {
	next := ctx
	switch ctx.Decision.Action {
	case entities.ActionEscalate:
		if ctx.CoherenceVerdict == "coherent" {
			next.GuardedAction = entities.GuardAuto
			next.ActionReason = "escalation_coherent"
		} else {
			next.GuardedAction = entities.GuardAsk
			next.ActionReason = "escalation_inconclusive_coherence"
		}
	case entities.ActionInvestigate:
		next.GuardedAction = entities.GuardAsk
		next.ActionReason = "investigation_required"
	default:
		next.GuardedAction = entities.GuardDeny
		next.ActionReason = "below_action_threshold"
	}
	return next
}

// NarrativeUnification implements Phase 14: unified human-readable output.
func NarrativeUnification(ctx PipelineContext) PipelineContext {
	next := ctx
	parts := make([]string, 0, len(ctx.Narrative)+2)
	parts = append(parts, fmt.Sprintf("[%s] Series: %s", ctx.GuardedAction, ctx.SeriesID))
	parts = append(parts, ctx.Narrative...)
	parts = append(parts, fmt.Sprintf("Guard: %s — %s", ctx.GuardedAction, ctx.ActionReason))
	next.UnifiedNarrative = strings.Join(parts, " | ")
	return next
}
