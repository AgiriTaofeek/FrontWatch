package telemetry

import (
	"errors"
	"testing"
	"time"
)

func validEvent() Event {
	return Event{
		EventID:   "evt_123",
		EventType: EventTypeError,
		Timestamp: time.Now(),
		Payload: ErrorPayload{
			Message:       "boom",
			ExceptionType: "TypeError",
			Handled:       false,
		},
	}
}

func TestEvent_Validate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(e Event) Event
		wantErr error
	}{
		{
			name:    "valid event passes",
			mutate:  func(e Event) Event { return e },
			wantErr: nil,
		},
		{
			name:    "missing event_id",
			mutate:  func(e Event) Event { e.EventID = ""; return e },
			wantErr: ErrMissingEventID,
		},
		{
			name:    "unsupported event_type",
			mutate:  func(e Event) Event { e.EventType = "network"; return e },
			wantErr: ErrUnsupportedType,
		},
		{
			name:    "missing timestamp",
			mutate:  func(e Event) Event { e.Timestamp = time.Time{}; return e },
			wantErr: ErrMissingTimestamp,
		},
		{
			name:    "missing payload message",
			mutate:  func(e Event) Event { e.Payload.Message = ""; return e },
			wantErr: ErrMissingMessage,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.mutate(validEvent()).Validate()

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
