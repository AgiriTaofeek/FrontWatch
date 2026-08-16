// Package telemetry is the domain layer for ingested events — business
// rules only. Per code-structure.md's strict dependency direction, this
// package must never import PostgreSQL, ClickHouse, Redpanda, or HTTP —
// it works with plain Go values, nothing more. JSON decoding happens in
// the adapter/handler layer; this package only validates values it's
// handed.
package telemetry

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// EventType is a real four-member set — packages/sdk's navigation
// instrumentation (the framework-adapter gap's own prerequisite) made
// "navigation" real, matching this package's own earlier note that
// said to extend this when a new event_type is real. breadcrumb
// deliberately does *not* become a fifth member here — per the design
// confirmed with the user, breadcrumbs are a trail attached to
// ErrorPayload (see the Breadcrumb type below), not their own
// standalone event type.
type EventType string

const (
	EventTypeError       EventType = "error"
	EventTypeNetwork     EventType = "network"
	EventTypePerformance EventType = "performance"
	EventTypeNavigation  EventType = "navigation"
)

var (
	ErrMissingEventID    = errors.New("event_id is required")
	ErrUnsupportedType   = errors.New("unsupported event_type")
	ErrMissingTimestamp  = errors.New("timestamp is required")
	ErrMissingMessage    = errors.New("payload.message is required")
	ErrMissingMethod     = errors.New("payload.method is required")
	ErrMissingResource   = errors.New("payload.resource is required")
	ErrMissingMetricName = errors.New("payload.metric_name is required")
	ErrMissingToRoute    = errors.New("payload.to_route is required")
	ErrMissingPayload    = errors.New("payload is required")
	ErrUnsupportedSchema = errors.New("unsupported schema_version")
)

// Breadcrumb mirrors packages/contracts' WireBreadcrumb — the trail
// attached to an error's own payload (packages/sdk/src/breadcrumbs.ts),
// not a standalone event type. Data is untyped JSON on purpose: it's a
// developer-supplied bag via the SDK's addBreadcrumb(), already redacted
// client-side (privacy.ts) before it ever reaches here — this struct
// just needs to round-trip it, not interpret it.
type Breadcrumb struct {
	Category  string                 `json:"category"`
	Message   string                 `json:"message"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// ErrorPayload mirrors packages/contracts' WireErrorPayload — same
// wire contract (api-contracts.md §4), different language.
type ErrorPayload struct {
	Message       string       `json:"message"`
	ExceptionType string       `json:"exception_type"`
	StackTrace    string       `json:"stack_trace,omitempty"`
	Fingerprint   string       `json:"fingerprint,omitempty"`
	Handled       bool         `json:"handled"`
	Breadcrumbs   []Breadcrumb `json:"breadcrumbs,omitempty"`
}

// NetworkPayload mirrors packages/contracts' WireNetworkPayload.
type NetworkPayload struct {
	Method     string  `json:"method"`
	Resource   string  `json:"resource"`
	Status     int     `json:"status"`
	DurationMs float64 `json:"duration_ms"`
	Outcome    string  `json:"outcome"`
}

// PerformancePayload mirrors packages/contracts' WirePerformancePayload
// — one Core Web Vitals measurement (packages/sdk/src/performance.ts's
// thin adapter over the official web-vitals library). Value is
// deliberately not required by Validate() below: a CLS value of 0 is a
// real, valid measurement (no layout shift occurred), not a missing
// one, so "zero" can't be treated as "absent" here the way it can for
// most other numeric fields in this codebase.
type PerformancePayload struct {
	MetricName     string  `json:"metric_name"`
	Value          float64 `json:"value"`
	Rating         string  `json:"rating"`
	NavigationType string  `json:"navigation_type,omitempty"`
}

// NavigationPayload mirrors packages/contracts' WireNavigationPayload —
// a standalone, independently-queryable event, distinct from a
// "navigation"-category Breadcrumb (context attached to a future
// error's payload, not investigable on its own). FromRoute is a
// pointer, not a plain string with omitempty: an empty string and "no
// prior route at all" (the very first navigation an SDK instance
// observes) are genuinely different states, and Validate() below must
// be able to tell them apart the same way PerformancePayload.Value's
// own comment already explains for "zero isn't absent."
type NavigationPayload struct {
	FromRoute      *string `json:"from_route,omitempty"`
	ToRoute        string  `json:"to_route"`
	NavigationType string  `json:"navigation_type"`
}

// Event is a single decoded telemetry event. Payload is now a real
// discriminated shape — exactly one of ErrorPayload/NetworkPayload/
// PerformancePayload is set, chosen by EventType — mirroring
// packages/contracts' WireEvent union on the TS side. A plain
// `any`/interface{} field was considered and rejected: it would push
// every consumer (Validate, the fingerprint step, the ClickHouse
// writer) back into runtime type assertions this struct can rule out
// instead. All three payload fields carry `json:"-"`; Event's own
// MarshalJSON/UnmarshalJSON own the wire "payload" key, since encoding/
// json can't pick a struct type from a sibling field on its own.
type Event struct {
	EventID            string              `json:"event_id"`
	EventType          EventType           `json:"event_type"`
	SchemaVersion      int                 `json:"schema_version"`
	Timestamp          time.Time           `json:"timestamp"`
	Release            string              `json:"release,omitempty"`
	SessionID          string              `json:"session_id,omitempty"`
	Route              string              `json:"route,omitempty"`
	ErrorPayload       *ErrorPayload       `json:"-"`
	NetworkPayload     *NetworkPayload     `json:"-"`
	PerformancePayload *PerformancePayload `json:"-"`
	NavigationPayload  *NavigationPayload  `json:"-"`
}

// eventWire is Event's wire shape — same fields, but a single untyped
// Payload so MarshalJSON/UnmarshalJSON can share one struct definition
// instead of drifting apart in two places.
type eventWire struct {
	EventID       string          `json:"event_id"`
	EventType     EventType       `json:"event_type"`
	SchemaVersion int             `json:"schema_version"`
	Timestamp     time.Time       `json:"timestamp"`
	Release       string          `json:"release,omitempty"`
	SessionID     string          `json:"session_id,omitempty"`
	Route         string          `json:"route,omitempty"`
	Payload       json.RawMessage `json:"payload"`
}

func (e Event) MarshalJSON() ([]byte, error) {
	payload, err := e.PayloadJSON()
	if err != nil {
		return nil, err
	}
	return json.Marshal(eventWire{
		EventID:       e.EventID,
		EventType:     e.EventType,
		SchemaVersion: e.SchemaVersion,
		Timestamp:     e.Timestamp,
		Release:       e.Release,
		SessionID:     e.SessionID,
		Route:         e.Route,
		Payload:       payload,
	})
}

func (e *Event) UnmarshalJSON(data []byte) error {
	var wire eventWire
	if err := json.Unmarshal(data, &wire); err != nil {
		return err
	}

	e.EventID = wire.EventID
	e.EventType = wire.EventType
	e.SchemaVersion = wire.SchemaVersion
	e.Timestamp = wire.Timestamp
	e.Release = wire.Release
	e.SessionID = wire.SessionID
	e.Route = wire.Route
	e.ErrorPayload = nil
	e.NetworkPayload = nil
	e.PerformancePayload = nil
	e.NavigationPayload = nil

	// Unknown event_types decode with no payload attached — Validate()
	// is what actually rejects them; decoding itself stays permissive so
	// a malformed/future event_type still produces a usable Event for
	// error reporting, not a hard decode failure.
	switch wire.EventType {
	case EventTypeNetwork:
		var payload NetworkPayload
		if len(wire.Payload) > 0 {
			if err := json.Unmarshal(wire.Payload, &payload); err != nil {
				return fmt.Errorf("decoding network payload: %w", err)
			}
		}
		e.NetworkPayload = &payload
	case EventTypePerformance:
		var payload PerformancePayload
		if len(wire.Payload) > 0 {
			if err := json.Unmarshal(wire.Payload, &payload); err != nil {
				return fmt.Errorf("decoding performance payload: %w", err)
			}
		}
		e.PerformancePayload = &payload
	case EventTypeNavigation:
		var payload NavigationPayload
		if len(wire.Payload) > 0 {
			if err := json.Unmarshal(wire.Payload, &payload); err != nil {
				return fmt.Errorf("decoding navigation payload: %w", err)
			}
		}
		e.NavigationPayload = &payload
	case EventTypeError:
		var payload ErrorPayload
		if len(wire.Payload) > 0 {
			if err := json.Unmarshal(wire.Payload, &payload); err != nil {
				return fmt.Errorf("decoding error payload: %w", err)
			}
		}
		e.ErrorPayload = &payload
	}

	return nil
}

// PayloadJSON marshals whichever payload EventType selects — the one
// place that switch lives, shared by MarshalJSON and the ClickHouse
// writer (which stores the payload as a raw JSON string column).
func (e Event) PayloadJSON() ([]byte, error) {
	switch e.EventType {
	case EventTypeNetwork:
		return json.Marshal(e.NetworkPayload)
	case EventTypePerformance:
		return json.Marshal(e.PerformancePayload)
	case EventTypeNavigation:
		return json.Marshal(e.NavigationPayload)
	default:
		return json.Marshal(e.ErrorPayload)
	}
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
	if e.Timestamp.IsZero() {
		return ErrMissingTimestamp
	}

	switch e.EventType {
	case EventTypeError:
		if e.ErrorPayload == nil {
			return ErrMissingPayload
		}
		if e.ErrorPayload.Message == "" {
			return ErrMissingMessage
		}
	case EventTypeNetwork:
		if e.NetworkPayload == nil {
			return ErrMissingPayload
		}
		if e.NetworkPayload.Method == "" {
			return ErrMissingMethod
		}
		if e.NetworkPayload.Resource == "" {
			return ErrMissingResource
		}
	case EventTypePerformance:
		if e.PerformancePayload == nil {
			return ErrMissingPayload
		}
		if e.PerformancePayload.MetricName == "" {
			return ErrMissingMetricName
		}
	case EventTypeNavigation:
		if e.NavigationPayload == nil {
			return ErrMissingPayload
		}
		if e.NavigationPayload.ToRoute == "" {
			return ErrMissingToRoute
		}
	default:
		return fmt.Errorf("%w: %q", ErrUnsupportedType, e.EventType)
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
