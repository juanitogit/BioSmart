package pipeline

import (
	"context"
	"fmt"
	"time"
	"gophermind_ai/internal/engines"
	"gophermind_ai/internal/entities"
)

// Predict implements Phase 5: concurrent engine execution with goroutines.
// Each engine runs in its own goroutine with a strict timeout enforced via
// context.WithTimeout. Results are collected via a buffered channel.
//
// This replaces the Python ThreadPoolExecutor pattern with Go's native
// concurrency primitives, providing:
//   - True parallelism (no GIL equivalent)
//   - 4KB goroutine stacks (vs ~1MB OS threads)
//   - Precise deadline enforcement via context cancellation
//   - Panic recovery per-goroutine (one engine crash doesn't kill others)
func Predict(ctx PipelineContext, allEngines []engines.PredictionEngine,
	timeoutMs int) PipelineContext {

	next := ctx
	vals := ctx.SeasonalAdjusted
	if len(vals) == 0 {
		vals = ctx.CleanValues
	}
	if len(vals) == 0 {
		vals = ctx.Values
	}

	// Create per-engine timeout context
	engineCtx, cancel := context.WithTimeout(context.Background(),
		time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	// Buffered channel to prevent goroutine leaks
	resultCh := make(chan engineResult, len(allEngines))

	// Launch goroutines concurrently
	launched := 0
	for _, eng := range allEngines {
		if !eng.CanHandle(len(vals)) {
			next.EngineFailures = append(next.EngineFailures, entities.EngineFailure{
				Engine: eng.Name(),
				Reason: "cannot_handle",
			})
			continue
		}
		launched++
		go runEngine(engineCtx, eng, vals, ctx.Timestamps, resultCh)
	}

	// Collect results with deadline
	for i := 0; i < launched; i++ {
		select {
		case r := <-resultCh:
			if r.err != nil {
				next.EngineFailures = append(next.EngineFailures, entities.EngineFailure{
					Engine: r.name,
					Reason: r.err.Error(),
				})
			} else {
				next.Perceptions = append(next.Perceptions, entities.EnginePerception{
					EngineName:     r.name,
					PredictedValue: r.output.PredictedValue,
					Confidence:     r.output.Confidence,
					Trend:          r.output.Trend,
					LatencyMs:      r.latencyMs,
				})
			}
		case <-engineCtx.Done():
			next.EngineFailures = append(next.EngineFailures, entities.EngineFailure{
				Engine: "pipeline",
				Reason: "predict_budget_exceeded",
			})
			// Drain remaining to prevent goroutine leaks
			go func() {
				for j := i; j < launched; j++ {
					<-resultCh
				}
			}()
			return next
		}
	}

	return next
}

type engineResult struct {
	name      string
	output    engines.EngineOutput
	latencyMs float64
	err       error
}

// runEngine executes a single engine with panic recovery.
func runEngine(ctx context.Context, eng engines.PredictionEngine,
	values, timestamps []float64, ch chan<- engineResult) {

	start := time.Now()
	defer func() {
		if r := recover(); r != nil {
			ch <- engineResult{
				name: eng.Name(),
				err:  fmt.Errorf("panic: %v", r),
			}
		}
	}()

	output := eng.Predict(ctx, values, timestamps)
	latency := float64(time.Since(start).Microseconds()) / 1000.0

	if output.Err != nil {
		ch <- engineResult{name: eng.Name(), err: output.Err, latencyMs: latency}
		return
	}

	ch <- engineResult{
		name:      eng.Name(),
		output:    output,
		latencyMs: latency,
	}
}
