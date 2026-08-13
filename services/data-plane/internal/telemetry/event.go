// Package telemetry is the domain layer for ingested events — business
// rules only. Per code-structure.md's strict dependency direction, this
// package must never import PostgreSQL, ClickHouse, Redpanda, or HTTP —
// it works with plain Go values, nothing more. JSON decoding happens in
// the adapter/handler layer; this package only validates values it's
// handed.
package telemetry

import (
	"errors"
	"fmt"
	"time"
)

// EventType is a closed set for now — only "error" exists, matching
// packages/sdk and packages/contracts. Extending this to
// network/performance/breadcrumb happens alongside their instrumentation
// modules, not speculatively ahead of them.
type EventType string

const EventTypeError EventType = "error"

var (
	ErrMissingEventID    = errors.New("event_id is required")
	ErrUnsupportedType   = errors.New("unsupported event_type")
	ErrMissingTimestamp  = errors.New("timestamp is required")
	ErrMissingMessage    = errors.New("payload.message is required")
	ErrUnsupportedSchema = errors.New("unsupported schema_version")
)

// ErrorPayload mirrors packages/contracts' WireErrorPayload — same
// wire contract (api-contracts.md §4), different language.
type ErrorPayload struct {
	Message       string `json:"message"`
	ExceptionType string `json:"exception_type"`
	StackTrace    string `json:"stack_trace,omitempty"`
	Fingerprint   string `json:"fingerprint,omitempty"`
	Handled       bool   `json:"handled"`
}

// Event is a single decoded telemetry event. Payload is a concrete
// ErrorPayload, not a generic/union type — there's only one event_type
// right now, and building polymorphic payload handling for types that
// don't exist yet would be exactly the kind of speculative abstraction
// services.md warns against for repositories. Revisit when a second
// event_type is real.
type Event struct {
	EventID   string       `json:"event_id"`
	EventType EventType    `json:"event_type"`
	Timestamp time.Time    `json:"timestamp"`
	Release   string       `json:"release,omitempty"`
	SessionID string       `json:"session_id,omitempty"`
	Route     string       `json:"route,omitempty"`
	Payload   ErrorPayload `json:"payload"`
}

// Validate checks exactly the required fields api-contracts.md §4 names:
// event_id, schema_version (checked at the request level, see
// IngestRequest.Validate), event_type, timestamp, payload. Every field
// here is untrusted input (services.md's ingestion rule) — nothing is
// assumed valid just because it deserialized.
func (e Event) Validate() error {
	if e.EventID == "" {
		return ErrMissingEventID
	}
	if e.EventType != EventTypeError {
		return fmt.Errorf("%w: %q", ErrUnsupportedType, e.EventType)
	}
	if e.Timestamp.IsZero() {
		return ErrMissingTimestamp
	}
	if e.Payload.Message == "" {
		return ErrMissingMessage
	}
	return nil
}

// IngestRequest is the batch envelope — mirrors packages/contracts'
// IngestRequest exactly (schema_version, sent_at, events).
type IngestRequest struct {
	SchemaVersion int       `json:"schema_version"`
	SentAt        time.Time `json:"sent_at"`
	Events        []Event   `json:"events"`
}

func (r IngestRequest) Validate() error {
	if r.SchemaVersion != 1 {
		return fmt.Errorf("%w: %d", ErrUnsupportedSchema, r.SchemaVersion)
	}
	return nil
}
