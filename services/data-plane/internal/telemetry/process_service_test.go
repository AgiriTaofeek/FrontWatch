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
			ErrorPayload:  &ErrorPayload{Message: "boom", ExceptionType: "TypeError"},
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

	t.Run("passes a valid network event through without fingerprinting", func(t *testing.T) {
		fp := &fakeFingerprinter{}
		service := NewProcessEventService(fp)

		event := Event{
			EventID:        "evt_net_1",
			EventType:      EventTypeNetwork,
			SchemaVersion:  1,
			Timestamp:      time.Now(),
			NetworkPayload: &NetworkPayload{Method: "GET", Resource: "/api/users/:id", Status: 200, Outcome: "success"},
		}

		result, err := service.Process(event)
		if err != nil {
			t.Fatalf("Process() = %v, want nil", err)
		}
		if result.Fingerprint != "" {
			t.Errorf("Fingerprint = %q, want empty (network events aren't fingerprinted)", result.Fingerprint)
		}
		if fp.calls != 0 {
			t.Errorf("Fingerprinter called %d times, want 0", fp.calls)
		}
	})

	t.Run("passes a valid performance event through without fingerprinting", func(t *testing.T) {
		fp := &fakeFingerprinter{}
		service := NewProcessEventService(fp)

		event := Event{
			EventID:            "evt_perf_1",
			EventType:          EventTypePerformance,
			SchemaVersion:      1,
			Timestamp:          time.Now(),
			PerformancePayload: &PerformancePayload{MetricName: "LCP", Value: 1800, Rating: "good"},
		}

		result, err := service.Process(event)
		if err != nil {
			t.Fatalf("Process() = %v, want nil", err)
		}
		if result.Fingerprint != "" {
			t.Errorf("Fingerprint = %q, want empty (performance events aren't fingerprinted)", result.Fingerprint)
		}
		if fp.calls != 0 {
			t.Errorf("Fingerprinter called %d times, want 0", fp.calls)
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
