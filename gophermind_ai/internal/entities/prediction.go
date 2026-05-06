package entities

// PredictionResult holds the output of a single prediction engine or the
// fused consensus of the entire pipeline.
type PredictionResult struct {
	PredictedValue *float64               `json:"predicted_value"`
	Confidence     float64                `json:"confidence"`
	Trend          string                 `json:"trend"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	IsFallback     bool                   `json:"is_fallback"`
	FallbackReason string                 `json:"fallback_reason,omitempty"`
}

// EnginePerception wraps a prediction result with engine attribution.
type EnginePerception struct {
	EngineName     string  `json:"engine_name"`
	PredictedValue float64 `json:"predicted_value"`
	Confidence     float64 `json:"confidence"`
	Trend          string  `json:"trend"`
	LatencyMs      float64 `json:"latency_ms"`
	Inhibited      bool    `json:"inhibited"`
}

// EngineFailure records why a prediction engine could not produce a result.
type EngineFailure struct {
	Engine string `json:"engine"`
	Reason string `json:"reason"` // "timeout", "panic", "cannot_handle"
}

// DecisionAction represents the recommended operational response.
type DecisionAction string

const (
	ActionEscalate    DecisionAction = "ESCALATE"
	ActionInvestigate DecisionAction = "INVESTIGATE"
	ActionMonitor     DecisionAction = "MONITOR"
	ActionLogOnly     DecisionAction = "LOG_ONLY"
)

// Decision captures the contextual decision engine output.
type Decision struct {
	Action     DecisionAction `json:"action"`
	Score      float64        `json:"score"`
	Priority   int            `json:"priority"`
	Reason     string         `json:"reason"`
	Amplifiers []string       `json:"amplifiers,omitempty"`
	Attenuators []string      `json:"attenuators,omitempty"`
}

// GuardVerdict represents the action guard output.
type GuardVerdict string

const (
	GuardAuto GuardVerdict = "AUTO"
	GuardAsk  GuardVerdict = "ASK"
	GuardDeny GuardVerdict = "DENY"
)
