package telemetry

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeCredentials struct {
	projectID string
	err       error
}

func (f fakeCredentials) ValidateCredential(_ context.Context, _ string) (string, error) {
	return f.projectID, f.err
}

type fakePublisher struct {
	published []Event
	failFor   string // EventID that should fail to publish, if any
}

func (f *fakePublisher) PublishEvent(_ context.Context, _ string, event Event) error {
	if event.EventID == f.failFor {
		return errors.New("publish failed")
	}
	f.published = append(f.published, event)
	return nil
}

func validRequest() IngestRequest {
	return IngestRequest{
		SchemaVersion: 1,
		SentAt:        time.Now(),
		Events: []Event{
			{
				EventID:      "evt_1",
				EventType:    EventTypeError,
				Timestamp:    time.Now(),
				ErrorPayload: &ErrorPayload{Message: "boom", ExceptionType: "Error"},
			},
		},
	}
}

func TestIngestService_Ingest(t *testing.T) {
	t.Run("accepts a valid event and publishes it", func(t *testing.T) {
		publisher := &fakePublisher{}
		service := NewIngestService(fakeCredentials{projectID: "proj_1"}, publisher)

		result, err := service.Ingest(context.Background(), "fw_pk_valid", validRequest())
		if err != nil {
			t.Fatalf("Ingest() = %v, want nil", err)
		}
		if result.Accepted != 1 || result.Rejected != 0 {
			t.Fatalf("result = %+v, want 1 accepted, 0 rejected", result)
		}
		if len(publisher.published) != 1 {
			t.Fatalf("published %d events, want 1", len(publisher.published))
		}
	})

	t.Run("accepts a valid network event and publishes it", func(t *testing.T) {
		publisher := &fakePublisher{}
		service := NewIngestService(fakeCredentials{projectID: "proj_1"}, publisher)

		req := IngestRequest{
			SchemaVersion: 1,
			SentAt:        time.Now(),
			Events: []Event{
				{
					EventID:        "evt_net_1",
					EventType:      EventTypeNetwork,
					Timestamp:      time.Now(),
					NetworkPayload: &NetworkPayload{Method: "GET", Resource: "/api/users/:id", Status: 200, Outcome: "success"},
				},
			},
		}

		result, err := service.Ingest(context.Background(), "fw_pk_valid", req)
		if err != nil {
			t.Fatalf("Ingest() = %v, want nil", err)
		}
		if result.Accepted != 1 || result.Rejected != 0 {
			t.Fatalf("result = %+v, want 1 accepted, 0 rejected", result)
		}
	})

	t.Run("accepts a valid performance event and publishes it", func(t *testing.T) {
		publisher := &fakePublisher{}
		service := NewIngestService(fakeCredentials{projectID: "proj_1"}, publisher)

		req := IngestRequest{
			SchemaVersion: 1,
			SentAt:        time.Now(),
			Events: []Event{
				{
					EventID:            "evt_perf_1",
					EventType:          EventTypePerformance,
					Timestamp:          time.Now(),
					PerformancePayload: &PerformancePayload{MetricName: "LCP", Value: 1800, Rating: "good"},
				},
			},
		}

		result, err := service.Ingest(context.Background(), "fw_pk_valid", req)
		if err != nil {
			t.Fatalf("Ingest() = %v, want nil", err)
		}
		if result.Accepted != 1 || result.Rejected != 0 {
			t.Fatalf("result = %+v, want 1 accepted, 0 rejected", result)
		}
	})

	t.Run("rejects the whole batch for an invalid credential", func(t *testing.T) {
		publisher := &fakePublisher{}
		service := NewIngestService(fakeCredentials{err: errors.New("not found")}, publisher)

		_, err := service.Ingest(context.Background(), "fw_pk_bad", validRequest())
		if !errors.Is(err, ErrInvalidCredential) {
			t.Fatalf("Ingest() = %v, want %v", err, ErrInvalidCredential)
		}
		if len(publisher.published) != 0 {
			t.Fatalf("published %d events, want 0 (credential was invalid)", len(publisher.published))
		}
	})

	t.Run("rejects only the malformed event in a batch, accepts the rest", func(t *testing.T) {
		publisher := &fakePublisher{}
		service := NewIngestService(fakeCredentials{projectID: "proj_1"}, publisher)

		req := validRequest()
		req.Events = append(req.Events, Event{EventID: "evt_bad", EventType: EventTypeError}) // missing timestamp/payload

		result, err := service.Ingest(context.Background(), "fw_pk_valid", req)
		if err != nil {
			t.Fatalf("Ingest() = %v, want nil (partial acceptance, not a batch-level error)", err)
		}
		if result.Accepted != 1 || result.Rejected != 1 {
			t.Fatalf("result = %+v, want 1 accepted, 1 rejected", result)
		}
		if result.Rejections[0].EventID != "evt_bad" || result.Rejections[0].Code != "INVALID_EVENT" {
			t.Errorf("Rejections[0] = %+v, want {evt_bad INVALID_EVENT}", result.Rejections[0])
		}
	})

	t.Run("rejects an event that fails to publish, still accepts the rest", func(t *testing.T) {
		publisher := &fakePublisher{failFor: "evt_1"}
		service := NewIngestService(fakeCredentials{projectID: "proj_1"}, publisher)

		req := validRequest()
		req.Events = append(req.Events, Event{
			EventID:      "evt_2",
			EventType:    EventTypeError,
			Timestamp:    time.Now(),
			ErrorPayload: &ErrorPayload{Message: "ok", ExceptionType: "Error"},
		})

		result, err := service.Ingest(context.Background(), "fw_pk_valid", req)
		if err != nil {
			t.Fatalf("Ingest() = %v, want nil", err)
		}
		if result.Accepted != 1 || result.Rejected != 1 {
			t.Fatalf("result = %+v, want 1 accepted, 1 rejected", result)
		}
		if result.Rejections[0].Code != "QUEUE_PUBLISH_FAILED" {
			t.Errorf("Rejections[0].Code = %q, want QUEUE_PUBLISH_FAILED", result.Rejections[0].Code)
		}
	})

	t.Run("rejects an unsupported schema_version before checking credentials", func(t *testing.T) {
		credentials := fakeCredentials{projectID: "proj_1"}
		service := NewIngestService(credentials, &fakePublisher{})

		req := validRequest()
		req.SchemaVersion = 2

		_, err := service.Ingest(context.Background(), "fw_pk_valid", req)
		if !errors.Is(err, ErrUnsupportedSchema) {
			t.Fatalf("Ingest() = %v, want %v", err, ErrUnsupportedSchema)
		}
	})
}
