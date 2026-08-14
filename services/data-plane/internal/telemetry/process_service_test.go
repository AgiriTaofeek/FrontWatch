package telemetry

import (
	"testing"
	"time"
)

type fakeFingerprinter struct {
	fingerprint string
	version     uint16
	calls       int
}

func (f *fakeFingerprinter) Fingerprint(_, _ string) (string, uint16) {
	f.calls++
	return f.fingerprint, f.version
}

func TestProcessEventService_Process(t *testing.T) {
	t.Run("fingerprints a valid error event", func(t *testing.T) {
		fp := &fakeFingerprinter{fingerprint: "abc123", version: 1}
		service := NewProcessEventService(fp)

		event := Event{
			EventID:       "evt_1",
			EventType:     EventTypeError,
			SchemaVersion: 1,
			Timestamp:     time.Now(),
			Payload:       ErrorPayload{Message: "boom", ExceptionType: "TypeError"},
		}

		result, err := service.Process(event)
		if err != nil {
			t.Fatalf("Process() = %v, want nil", err)
		}
		if result.Fingerprint != "abc123" || result.FingerprintVersion != 1 {
			t.Errorf("result = %+v, want fingerprint abc123 v1", result)
		}
		if fp.calls != 1 {
			t.Errorf("Fingerprinter called %d times, want 1", fp.calls)
		}
	})

	t.Run("rejects an invalid event before fingerprinting", func(t *testing.T) {
		fp := &fakeFingerprinter{}
		service := NewProcessEventService(fp)

		_, err := service.Process(Event{EventType: EventTypeError}) // missing event_id, timestamp, payload

		if err == nil {
			t.Fatal("Process() = nil, want a validation error")
		}
		if fp.calls != 0 {
			t.Errorf("Fingerprinter called %d times, want 0 (invalid event should never reach it)", fp.calls)
		}
	})
}
