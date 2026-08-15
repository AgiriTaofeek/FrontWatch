package queue

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

// Integration test — hits the real local Redpanda, same as
// internal/storage/postgres does for Postgres. Skips cleanly if
// REDPANDA_BROKERS isn't set.
//
// telemetry.raw is a real, shared, append-only topic — previous test
// runs leave old records in it. Rather than assuming an empty topic,
// this publishes an event with a unique EventID and polls until it
// finds that specific record, bounded by a timeout.
func testBrokers(t *testing.T) []string {
	t.Helper()
	brokers := os.Getenv("REDPANDA_BROKERS")
	if brokers == "" {
		t.Skip("REDPANDA_BROKERS not set, skipping Redpanda integration test")
	}
	return strings.Split(brokers, ",")
}

func TestPublisher_PublishEvent(t *testing.T) {
	brokers := testBrokers(t)

	publisher, err := NewPublisher(brokers)
	if err != nil {
		t.Fatalf("NewPublisher() = %v", err)
	}
	t.Cleanup(publisher.Close)

	wantEvent := telemetry.Event{
		EventID:   "evt_queue_test_" + time.Now().Format(time.RFC3339Nano),
		EventType: telemetry.EventTypeError,
		Timestamp: time.Now().UTC().Truncate(time.Millisecond),
		ErrorPayload: &telemetry.ErrorPayload{
			Message:       "queue integration test",
			ExceptionType: "TestError",
			Handled:       true,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := publisher.PublishEvent(ctx, "test-project-id", wantEvent); err != nil {
		t.Fatalf("PublishEvent() = %v", err)
	}

	consumer, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumeTopics(RawTelemetryTopic),
		kgo.ConsumeStartOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		t.Fatalf("creating consumer: %v", err)
	}
	defer consumer.Close()

	found := false
	for !found {
		select {
		case <-ctx.Done():
			t.Fatalf("timed out waiting for event %q on %s", wantEvent.EventID, RawTelemetryTopic)
		default:
		}

		fetches := consumer.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			t.Fatalf("fetch error: %v", errs)
		}

		fetches.EachRecord(func(record *kgo.Record) {
			if found {
				return
			}
			var got telemetry.Event
			if err := json.Unmarshal(record.Value, &got); err != nil {
				return
			}
			if got.EventID != wantEvent.EventID {
				return
			}
			found = true

			if string(record.Key) != "test-project-id" {
				t.Errorf("record key = %q, want %q", record.Key, "test-project-id")
			}
			if got.ErrorPayload == nil || got.ErrorPayload.Message != wantEvent.ErrorPayload.Message {
				t.Errorf("ErrorPayload.Message = %v, want %q", got.ErrorPayload, wantEvent.ErrorPayload.Message)
			}
		})
	}
}

// TestPublisher_PublishEvent_RespectsContextDeadline is the regression
// test for the hard backstop PublishEvent added (Failure recovery,
// PROGRESS.md's Step 9 entry): real chaos testing found ProduceSync
// occasionally stayed blocked well past its own configured
// RecordDeliveryTimeout/RetryTimeout *and* past the caller's context
// deadline, non-deterministically, when Redpanda was repeatedly killed
// against the same long-lived client. This test doesn't depend on that
// exact non-determinism to reproduce reliably — it points the client
// at a non-routable address (guaranteed to never succeed or fail
// fast) and asserts PublishEvent still returns at (approximately) the
// context's own deadline, not later, proving the race against
// ctx.Done() is what actually bounds it, independent of whatever
// franz-go itself is doing.
func TestPublisher_PublishEvent_RespectsContextDeadline(t *testing.T) {
	// 10.255.255.1 is in a non-routable TEST-NET-adjacent range chosen
	// specifically to neither refuse the connection immediately nor
	// ever succeed — the "stuck," not "fast-fail," case this test needs.
	publisher, err := NewPublisher([]string{"10.255.255.1:9092"})
	if err != nil {
		t.Fatalf("NewPublisher() = %v", err)
	}
	t.Cleanup(publisher.Close)

	event := telemetry.Event{
		EventID:   "evt_ctx_deadline_test",
		EventType: telemetry.EventTypeError,
		Timestamp: time.Now().UTC(),
		ErrorPayload: &telemetry.ErrorPayload{
			Message:       "should never actually send",
			ExceptionType: "TestError",
			Handled:       true,
		},
	}

	const deadline = 2 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), deadline)
	defer cancel()

	start := time.Now()
	err = publisher.PublishEvent(ctx, "test-project-id", event)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("PublishEvent() = nil, want an error (an unreachable broker can never succeed)")
	}
	// Generous upper bound (deadline + 1s), not an exact match — this
	// asserts "bounded by ctx," not "bounded to the millisecond."
	if elapsed > deadline+time.Second {
		t.Errorf("PublishEvent() took %s, want at most ~%s (ctx.Done() should have ended it)", elapsed, deadline)
	}
}
