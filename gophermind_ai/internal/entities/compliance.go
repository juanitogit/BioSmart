package entities

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
)

// ComplianceRecord is the NDJSON audit record produced by the Assembly phase.
// Each pipeline execution generates exactly one record, signed with HMAC-SHA256.
type ComplianceRecord struct {
	SchemaVersion     string            `json:"schema_version"`
	RecordID          string            `json:"record_id"`
	CreatedAt         string            `json:"created_at"`
	SeriesID          string            `json:"series_id"`
	Outcome           PredictionOutcome `json:"outcome"`
	SanitizationFlags []string          `json:"sanitization_flags"`
	FusionFlags       []string          `json:"fusion_flags"`
	EngineFailures    []EngineFailure   `json:"engine_failures"`
	Hampel            *HampelDiag       `json:"hampel"`
	PipelineTiming    *PipelineTiming   `json:"pipeline_timing"`
	ExplanationDigest *string           `json:"explanation_digest"`
	ContentHash       string            `json:"content_hash"`
	HMACSHA256        *string           `json:"hmac_sha256"`
}

// PredictionOutcome is the core prediction data inside a compliance record.
type PredictionOutcome struct {
	PredictedValue *float64 `json:"predicted_value"`
	Confidence     float64  `json:"confidence"`
	Trend          string   `json:"trend"`
}

// HampelDiag captures Hampel filter diagnostic information.
type HampelDiag struct {
	RejectedCount int     `json:"rejected_count"`
	MAD           float64 `json:"mad"`
	Threshold     float64 `json:"threshold"`
}

// PipelineTiming records latency in milliseconds for each pipeline phase.
type PipelineTiming struct {
	SanitizeMs float64 `json:"sanitize_ms"`
	PerceiveMs float64 `json:"perceive_ms"`
	PredictMs  float64 `json:"predict_ms"`
	AdaptMs    float64 `json:"adapt_ms"`
	InhibitMs  float64 `json:"inhibit_ms"`
	FuseMs     float64 `json:"fuse_ms"`
	DecisionMs float64 `json:"decision_ms"`
	ExplainMs  float64 `json:"explain_ms"`
	TotalMs    float64 `json:"total_ms"`
}

// CanonicalJSON produces a deterministic JSON representation with
// lexicographically sorted keys and no whitespace, suitable for hashing.
func (r *ComplianceRecord) CanonicalJSON() ([]byte, error) {
	raw, err := json.Marshal(r)
	if err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	return marshalSorted(m)
}

// Sign computes the content_hash (SHA-256) and hmac_sha256 for the record.
func (r *ComplianceRecord) Sign(key []byte) error {
	saved := r.ContentHash
	savedHMAC := r.HMACSHA256
	r.ContentHash = ""
	r.HMACSHA256 = nil

	body, err := r.CanonicalJSON()
	if err != nil {
		r.ContentHash = saved
		r.HMACSHA256 = savedHMAC
		return err
	}

	hash := sha256.Sum256(body)
	r.ContentHash = hex.EncodeToString(hash[:])

	if len(key) > 0 {
		mac := hmac.New(sha256.New, key)
		mac.Write(body)
		sig := hex.EncodeToString(mac.Sum(nil))
		r.HMACSHA256 = &sig
	}
	return nil
}

// Verify checks the HMAC signature using constant-time comparison.
func (r *ComplianceRecord) Verify(key []byte) bool {
	if r.HMACSHA256 == nil {
		return false
	}
	expected := *r.HMACSHA256

	saved := r.ContentHash
	savedHMAC := r.HMACSHA256
	r.ContentHash = ""
	r.HMACSHA256 = nil

	body, err := r.CanonicalJSON()
	r.ContentHash = saved
	r.HMACSHA256 = savedHMAC
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, key)
	mac.Write(body)
	computed := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(computed), []byte(expected))
}

// marshalSorted serializes a map with sorted keys for deterministic output.
func marshalSorted(m map[string]interface{}) ([]byte, error) {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	buf := []byte("{")
	for i, k := range keys {
		if i > 0 {
			buf = append(buf, ',')
		}
		kb, _ := json.Marshal(k)
		buf = append(buf, kb...)
		buf = append(buf, ':')

		switch v := m[k].(type) {
		case map[string]interface{}:
			vb, err := marshalSorted(v)
			if err != nil {
				return nil, err
			}
			buf = append(buf, vb...)
		default:
			vb, err := json.Marshal(v)
			if err != nil {
				return nil, err
			}
			buf = append(buf, vb...)
		}
	}
	buf = append(buf, '}')
	return buf, nil
}
