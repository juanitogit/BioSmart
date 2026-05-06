package pipeline

import (
	"gophermind_ai/internal/entities"
	mathutil "gophermind_ai/internal/math"
)

// Adapt implements Phase 6: Bayesian weight resolution.
// Retrieves adaptive weights from the BayesianWeightTracker based on
// the current regime. If no Bayesian data exists, falls back to uniform weights.
func Adapt(ctx PipelineContext, tracker *mathutil.BayesianWeightTracker) PipelineContext {
	next := ctx
	regime := string(ctx.Regime)

	// Collect engine names from perceptions
	engineNames := make([]string, len(ctx.Perceptions))
	for i, p := range ctx.Perceptions {
		engineNames[i] = p.EngineName
	}

	if tracker != nil && tracker.HasData(regime) {
		next.ResolvedWeights = tracker.GetWeights(regime, engineNames)
	} else {
		// Uniform weights as fallback
		next.ResolvedWeights = make(map[string]float64, len(engineNames))
		if len(engineNames) > 0 {
			w := 1.0 / float64(len(engineNames))
			for _, name := range engineNames {
				next.ResolvedWeights[name] = w
			}
		}
	}

	return next
}

// Inhibit implements Phase 7: suppression of low-confidence engines.
// Engines with confidence below the dynamic threshold (mean - 1σ of
// all confidences) are marked as inhibited and excluded from fusion.
func Inhibit(ctx PipelineContext) PipelineContext {
	next := ctx

	if len(ctx.Perceptions) <= 1 {
		// No suppression with 0 or 1 engine
		next.InhibitedPerceptions = make([]entities.EnginePerception, len(ctx.Perceptions))
		copy(next.InhibitedPerceptions, ctx.Perceptions)
		return next
	}

	// Compute confidence statistics
	confs := make([]float64, len(ctx.Perceptions))
	for i, p := range ctx.Perceptions {
		confs[i] = p.Confidence
	}
	meanConf := mathutil.Mean(confs)
	stdConf := mathutil.StdDev(confs)
	threshold := meanConf - stdConf

	for _, p := range ctx.Perceptions {
		if p.Confidence >= threshold {
			next.InhibitedPerceptions = append(next.InhibitedPerceptions, p)
		} else {
			p.Inhibited = true
			next.InhibitedPerceptions = append(next.InhibitedPerceptions, p)
		}
	}

	return next
}

// Fuse implements Phase 8: Hampel filter + weighted consensus.
// First, the Hampel filter rejects outlier predictions using MAD.
// Then, surviving predictions are combined with resolved weights.
func Fuse(ctx PipelineContext, hampelK float64, hampelEnabled bool) PipelineContext {
	next := ctx

	// Collect non-inhibited predictions
	var activePredictions []float64
	var activeNames []string
	for _, p := range ctx.InhibitedPerceptions {
		if !p.Inhibited {
			activePredictions = append(activePredictions, p.PredictedValue)
			activeNames = append(activeNames, p.EngineName)
		}
	}

	if len(activePredictions) == 0 {
		// All inhibited — fallback to raw mean of all perceptions
		if len(ctx.Perceptions) > 0 {
			vals := make([]float64, len(ctx.Perceptions))
			for i, p := range ctx.Perceptions {
				vals[i] = p.PredictedValue
			}
			next.FusedValue = mathutil.Mean(vals)
			next.Confidence = 0.3
			next.Trend = "unknown"
			next.FusionFlags = append(next.FusionFlags, "all_inhibited_fallback")
		}
		return next
	}

	// Hampel outlier rejection
	filtered := activePredictions
	if hampelEnabled && len(activePredictions) >= 3 {
		result := mathutil.HampelFilter(activePredictions, hampelK)
		filtered = result.Filtered

		if result.RejectedCount > 0 {
			next.FusionFlags = append(next.FusionFlags,
				"hampel_rejected:"+itoa(result.RejectedCount))
			next.HampelDiag = &entities.HampelDiag{
				RejectedCount: result.RejectedCount,
				MAD:           result.MADValue,
				Threshold:     result.Threshold,
			}
		}
	}

	// Weighted fusion using resolved weights
	weightedSum := 0.0
	weightTotal := 0.0
	confSum := 0.0

	for i, val := range filtered {
		var name string
		if i < len(activeNames) {
			name = activeNames[i]
		}
		w := 1.0
		if ctx.ResolvedWeights != nil {
			if rw, ok := ctx.ResolvedWeights[name]; ok {
				w = rw
			}
		}
		weightedSum += val * w
		weightTotal += w

		// Also accumulate weighted confidence
		for _, p := range ctx.InhibitedPerceptions {
			if p.EngineName == name && !p.Inhibited {
				confSum += p.Confidence * w
				break
			}
		}
	}

	if weightTotal > 0 {
		next.FusedValue = weightedSum / weightTotal
		next.Confidence = confSum / weightTotal
	}

	// Trend by majority vote
	trendVotes := map[string]int{}
	for _, p := range ctx.InhibitedPerceptions {
		if !p.Inhibited {
			trendVotes[p.Trend]++
		}
	}
	maxVotes := 0
	for t, v := range trendVotes {
		if v > maxVotes {
			next.Trend = t
			maxVotes = v
		}
	}

	return next
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
