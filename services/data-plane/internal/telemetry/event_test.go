package telemetry

import (
	"encoding/json"
	"errors"
	"reflect"
	"testing"
	"time"
)

func validErrorEvent() Event {
	return Event{
		EventID:   "evt_123",
		EventType: EventTypeError,
		Timestamp: time.Now(),
		ErrorPayload: &ErrorPayload{
			Message:       "boom",
			ExceptionType: "TypeError",
			Handled:       false,
		},
	}
}

func validNetworkEvent() Event {
	return Event{
		EventID:   "evt_net_123",
		EventType: EventTypeNetwork,
		Timestamp: time.Now(),
		NetworkPayload: &NetworkPayload{
			Method:     "GET",
			Resource:   "/api/users/:id",
			Status:     200,
			DurationMs: 42,
			Outcome:    "success",
		},
	}
}

func validPerformanceEvent() Event {
	return Event{
		EventID:   "evt_perf_123",
		EventType: EventTypePerformance,
		Timestamp: time.Now(),
		PerformancePayload: &PerformancePayload{
			MetricName:     "LCP",
			Value:          1800,
			Rating:         "good",
			NavigationType: "navigate",
		},
	}
}

func validNavigationEvent() Event {
	fromRoute := "/accounts"
	return Event{
		EventID:   "evt_nav_123",
		EventType: EventTypeNavigation,
		Timestamp: time.Now(),
		NavigationPayload: &NavigationPayload{
			FromRoute:      &fromRoute,
			ToRoute:        "/settings",
			NavigationType: "push",
		},
	}
}

func TestEvent_Validate(t *testing.T) {
	tests := []struct {
		name    string
		event   Event
		mutate  func(e Event) Event
		wantErr error
	}{
		{
			name:    "valid error event passes",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { return e },
			wantErr: nil,
		},
		{
			name:    "missing event_id",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { e.EventID = ""; return e },
			wantErr: ErrMissingEventID,
		},
		{
			name:    "unsupported event_type",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { e.EventType = "breadcrumb"; return e },
			wantErr: ErrUnsupportedType,
		},
		{
			name:    "missing timestamp",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { e.Timestamp = time.Time{}; return e },
			wantErr: ErrMissingTimestamp,
		},
		{
			name:    "missing error payload",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { e.ErrorPayload = nil; return e },
			wantErr: ErrMissingPayload,
		},
		{
			name:    "missing payload message",
			event:   validErrorEvent(),
			mutate:  func(e Event) Event { e.ErrorPayload.Message = ""; return e },
			wantErr: ErrMissingMessage,
		},
		{
			name:    "valid network event passes",
			event:   validNetworkEvent(),
			mutate:  func(e Event) Event { return e },
			wantErr: nil,
		},
		{
			name:    "missing network payload",
			event:   validNetworkEvent(),
			mutate:  func(e Event) Event { e.NetworkPayload = nil; return e },
			wantErr: ErrMissingPayload,
		},
		{
			name:    "missing payload method",
			event:   validNetworkEvent(),
			mutate:  func(e Event) Event { e.NetworkPayload.Method = ""; return e },
			wantErr: ErrMissingMethod,
		},
		{
			name:    "missing payload resource",
			event:   validNetworkEvent(),
			mutate:  func(e Event) Event { e.NetworkPayload.Resource = ""; return e },
			wantErr: ErrMissingResource,
		},
		{
			name:    "valid performance event passes",
			event:   validPerformanceEvent(),
			mutate:  func(e Event) Event { return e },
			wantErr: nil,
		},
		{
			name:    "valid performance event with a zero value still passes (CLS=0 is real, not missing)",
			event:   validPerformanceEvent(),
			mutate:  func(e Event) Event { e.PerformancePayload.Value = 0; return e },
			wantErr: nil,
		},
		{
			name:    "missing performance payload",
			event:   validPerformanceEvent(),
			mutate:  func(e Event) Event { e.PerformancePayload = nil; return e },
			wantErr: ErrMissingPayload,
		},
		{
			name:    "missing payload metric_name",
			event:   validPerformanceEvent(),
			mutate:  func(e Event) Event { e.PerformancePayload.MetricName = ""; return e },
			wantErr: ErrMissingMetricName,
		},
		{
			name:    "valid navigation event passes",
			event:   validNavigationEvent(),
			mutate:  func(e Event) Event { return e },
			wantErr: nil,
		},
		{
			name:  "valid navigation event with a nil FromRoute still passes (the very first navigation)",
			event: validNavigationEvent(),
			mutate: func(e Event) Event {
				e.NavigationPayload.FromRoute = nil
				return e
			},
			wantErr: nil,
		},
		{
			name:    "missing navigation payload",
			event:   validNavigationEvent(),
			mutate:  func(e Event) Event { e.NavigationPayload = nil; return e },
			wantErr: ErrMissingPayload,
		},
		{
			name:    "missing payload to_route",
			event:   validNavigationEvent(),
			mutate:  func(e Event) Event { e.NavigationPayload.ToRoute = ""; return e },
			wantErr: ErrMissingToRoute,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.mutate(tt.event).Validate()

			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("Validate() = %v, want nil", err)
				}
				return
			}

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Validate() = %v, want error wrapping %v", err, tt.wantErr)
			}
		})
	}
}

// TestEvent_JSONRoundTrip covers the custom Marshal/UnmarshalJSON pair —
// the queue and worker round-trip an Event through JSON twice (ingestion
// -> Redpanda, Redpanda -> worker), so a bug here would silently corrupt
// every event in the pipeline, not just fail a unit test in isolation.
func TestEvent_JSONRoundTrip(t *testing.T) {
	t.Run("error event", func(t *testing.T) {
		want := validErrorEvent()
		want.SchemaVersion = 1
		want.Release = "1.0.0"
		want.SessionID = "sess_1"
		want.Route = "/dashboard"

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.NetworkPayload != nil {
			t.Errorf("NetworkPayload = %+v, want nil", got.NetworkPayload)
		}
		// reflect.DeepEqual, not !=/== — ErrorPayload gained a []Breadcrumb
		// field, and a struct containing a slice is no longer comparable
		// with Go's built-in equality operators at all (a compile error,
		// not a runtime one — caught immediately by adding the field).
		if got.ErrorPayload == nil || !reflect.DeepEqual(*got.ErrorPayload, *want.ErrorPayload) {
			t.Errorf("ErrorPayload = %+v, want %+v", got.ErrorPayload, want.ErrorPayload)
		}
		if got.EventID != want.EventID || got.EventType != want.EventType {
			t.Errorf("got = %+v, want %+v", got, want)
		}
	})

	t.Run("error event with breadcrumbs", func(t *testing.T) {
		// Breadcrumbs.ts's own trail: attached to ErrorPayload, not a
		// standalone event — this is the shape that actually reaches
		// ingestion once a customer's SDK has recorded any breadcrumbs
		// before an error. Data is a real, non-empty map — nil/empty is
		// already covered by validErrorEvent()'s plain case above.
		want := validErrorEvent()
		want.SchemaVersion = 1
		want.ErrorPayload.Breadcrumbs = []Breadcrumb{
			{Category: "navigation", Message: "Navigation -> /accounts", Timestamp: "2026-08-16T00:00:00.000Z"},
			{
				Category:  "custom",
				Message:   "retry attempted",
				Timestamp: "2026-08-16T00:00:01.000Z",
				Data:      map[string]interface{}{"attempt": float64(2)},
			},
		}

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.ErrorPayload == nil || !reflect.DeepEqual(*got.ErrorPayload, *want.ErrorPayload) {
			t.Errorf("ErrorPayload = %+v, want %+v", got.ErrorPayload, want.ErrorPayload)
		}
	})

	t.Run("network event", func(t *testing.T) {
		want := validNetworkEvent()
		want.SchemaVersion = 1

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.ErrorPayload != nil {
			t.Errorf("ErrorPayload = %+v, want nil", got.ErrorPayload)
		}
		if got.NetworkPayload == nil || *got.NetworkPayload != *want.NetworkPayload {
			t.Errorf("NetworkPayload = %+v, want %+v", got.NetworkPayload, want.NetworkPayload)
		}
	})

	t.Run("performance event", func(t *testing.T) {
		want := validPerformanceEvent()
		want.SchemaVersion = 1

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.ErrorPayload != nil {
			t.Errorf("ErrorPayload = %+v, want nil", got.ErrorPayload)
		}
		if got.NetworkPayload != nil {
			t.Errorf("NetworkPayload = %+v, want nil", got.NetworkPayload)
		}
		if got.PerformancePayload == nil || *got.PerformancePayload != *want.PerformancePayload {
			t.Errorf("PerformancePayload = %+v, want %+v", got.PerformancePayload, want.PerformancePayload)
		}
	})

	t.Run("navigation event", func(t *testing.T) {
		want := validNavigationEvent()
		want.SchemaVersion = 1

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.ErrorPayload != nil {
			t.Errorf("ErrorPayload = %+v, want nil", got.ErrorPayload)
		}
		// reflect.DeepEqual, not !=/== — NavigationPayload.FromRoute is a
		// *string; a plain != on the struct would compare pointer identity
		// (always different after a real JSON round-trip's fresh
		// allocation), not the pointed-to string content, the same class
		// of gotcha the []Breadcrumb slice field already taught this file
		// once for ErrorPayload.
		if got.NavigationPayload == nil || !reflect.DeepEqual(*got.NavigationPayload, *want.NavigationPayload) {
			t.Errorf("NavigationPayload = %+v, want %+v", got.NavigationPayload, want.NavigationPayload)
		}
	})

	t.Run("navigation event with a nil FromRoute round-trips as nil, not an empty string", func(t *testing.T) {
		want := validNavigationEvent()
		want.SchemaVersion = 1
		want.NavigationPayload.FromRoute = nil

		data, err := json.Marshal(want)
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var got Event
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		if got.NavigationPayload == nil {
			t.Fatalf("NavigationPayload = nil, want a payload")
		}
		if got.NavigationPayload.FromRoute != nil {
			t.Errorf("FromRoute = %v, want nil", *got.NavigationPayload.FromRoute)
		}
	})

	t.Run("payload survives the wire as the correct JSON shape", func(t *testing.T) {
		data, err := json.Marshal(validNetworkEvent())
		if err != nil {
			t.Fatalf("Marshal() = %v", err)
		}

		var raw map[string]any
		if err := json.Unmarshal(data, &raw); err != nil {
			t.Fatalf("Unmarshal() = %v", err)
		}

		payload, ok := raw["payload"].(map[string]any)
		if !ok {
			t.Fatalf("payload = %T, want an object", raw["payload"])
		}
		if payload["method"] != "GET" || payload["resource"] != "/api/users/:id" {
			t.Errorf("payload = %+v, want method/resource from NetworkPayload", payload)
		}
	})
}

func TestIngestRequest_Validate(t *testing.T) {
	t.Run("schema_version 1 passes", func(t *testing.T) {
		req := IngestRequest{SchemaVersion: 1}
		if err := req.Validate(); err != nil {
			t.Fatalf("Validate() = %v, want nil", err)
		}
	})

	t.Run("unsupported schema_version rejected", func(t *testing.T) {
		req := IngestRequest{SchemaVersion: 2}
		err := req.Validate()
		if !errors.Is(err, ErrUnsupportedSchema) {
			t.Fatalf("Validate() = %v, want error wrapping %v", err, ErrUnsupportedSchema)
		}
	})
}
