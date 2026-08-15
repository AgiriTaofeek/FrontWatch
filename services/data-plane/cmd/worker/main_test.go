package main

import (
	"context"
	"errors"
	"testing"
	"time"

	chstorage "github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/storage/clickhouse"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
	"github.com/twmb/franz-go/pkg/kgo"
)

// stubFingerprinter satisfies telemetry.Fingerprinter without pulling
// in internal/issue's real algorithm — decodeRecord's own tests only
// care that Process() ran, not what a real fingerprint looks like.
type stubFingerprinter struct{}

func (stubFingerprinter) Fingerprint(exceptionType, message string) (string, uint16) {
	return "stub-fingerprint", 1
}

func newTestService() *telemetry.ProcessEventService {
	return telemetry.NewProcessEventService(stubFingerprinter{})
}

// TestDecodeRecord_Success covers the batching change's most important
// pure-logic path: a well-formed record decodes, validates, and
// carries the Kafka record's key/timestamp into the StoredEvent
// exactly like the pre-batching processRecord did (project_id from
// record.Key, never the JSON body — ADR-022's rule).
func TestDecodeRecord_Success(t *testing.T) {
	record := &kgo.Record{
		Key: []byte("proj_test"),
		Value: []byte(`{
			"event_id": "evt_1",
			"event_type": "network",
			"schema_version": 1,
			"timestamp": "2026-08-15T12:00:00Z",
			"payload": {"method": "GET", "resource": "/api/x", "status": 200, "duration_ms": 12.5, "outcome": "success"}
		}`),
	}

	stored, ok := decodeRecord(record, newTestService())
	if !ok {
		t.Fatal("decodeRecord() ok = false, want true")
	}
	if stored.ProjectID != "proj_test" {
		t.Errorf("ProjectID = %q, want %q", stored.ProjectID, "proj_test")
	}
	if stored.Event.EventID != "evt_1" {
		t.Errorf("EventID = %q, want %q", stored.Event.EventID, "evt_1")
	}
}

// TestDecodeRecord_MalformedJSON covers the "permanent, still counts
// as done" classification — a decode failure returns false (don't
// add to the batch) but the caller commits its offset anyway, the
// same treatment processRecord gave it before batching existed.
func TestDecodeRecord_MalformedJSON(t *testing.T) {
	record := &kgo.Record{Value: []byte("not json")}

	_, ok := decodeRecord(record, newTestService())
	if ok {
		t.Fatal("decodeRecord() ok = true for malformed JSON, want false")
	}
}

// TestDecodeRecord_ValidationFailure covers the other permanent-failure
// path — well-formed JSON that fails Event.Validate() (missing the
// network payload's required fields here).
func TestDecodeRecord_ValidationFailure(t *testing.T) {
	record := &kgo.Record{
		Value: []byte(`{
			"event_id": "evt_2",
			"event_type": "network",
			"schema_version": 1,
			"timestamp": "2026-08-15T12:00:00Z",
			"payload": {}
		}`),
	}

	_, ok := decodeRecord(record, newTestService())
	if ok {
		t.Fatal("decodeRecord() ok = true for a validation failure, want false")
	}
}

// TestProcessFetch_EmptyIsANoOp guards against a nil/empty fetch
// (e.g. a poll that returned only errors, already filtered out by
// runLoop before this is ever called) reaching client.CommitRecords
// with no records — processFetch must return immediately rather than
// index records[len(records)-1] on an empty slice.
func TestProcessFetch_EmptyIsANoOp(t *testing.T) {
	// A nil *kgo.Client is fine here specifically because an empty
	// records slice must return before any client method is ever
	// called — this test fails with a nil-pointer panic if that early
	// return is ever removed.
	processFetch(t.Context(), nil, nil, newTestService(), nil)
}

// fakeBatchWriter simulates a ClickHouse that fails a fixed number of
// times before succeeding — persistBatchWithRetry's own tests don't
// need a real ClickHouse connection, just something that fails on
// command (Failure recovery, PROGRESS.md's Step 9 entry: this is the
// retry/backoff logic that closed the "a stuck batch was only ever
// redelivered by luck or a restart" gap).
type fakeBatchWriter struct {
	failUntilAttempt int // WriteBatch fails for calls 1..failUntilAttempt, succeeds after
	calls            int
}

func (f *fakeBatchWriter) WriteBatch(_ context.Context, _ []chstorage.StoredEvent) error {
	f.calls++
	if f.calls <= f.failUntilAttempt {
		return errors.New("simulated ClickHouse failure")
	}
	return nil
}

// TestPersistBatchWithRetry_RecoversAfterTransientFailures proves the
// core claim: a batch that fails is retried — not abandoned — and
// succeeds automatically the moment the dependency recovers, with no
// caller-visible error and no restart involved.
func TestPersistBatchWithRetry_RecoversAfterTransientFailures(t *testing.T) {
	writer := &fakeBatchWriter{failUntilAttempt: 2}
	batch := []chstorage.StoredEvent{{Event: telemetry.Event{EventID: "evt_retry_test"}}}

	err := persistBatchWithRetry(t.Context(), writer, batch, 10, 10)
	if err != nil {
		t.Fatalf("persistBatchWithRetry() = %v, want nil (should recover, not give up)", err)
	}
	if writer.calls != 3 {
		t.Errorf("calls = %d, want 3 (2 failures + 1 success)", writer.calls)
	}
}

// TestPersistBatchWithRetry_StopsOnShutdown proves the other half:
// retrying is bounded by context cancellation (graceful shutdown), not
// unbounded — a worker asked to stop while stuck retrying a batch must
// actually stop, leaving that batch uncommitted for redelivery on the
// next start, rather than blocking shutdown forever.
func TestPersistBatchWithRetry_StopsOnShutdown(t *testing.T) {
	writer := &fakeBatchWriter{failUntilAttempt: 1000} // never succeeds within this test
	batch := []chstorage.StoredEvent{{Event: telemetry.Event{EventID: "evt_shutdown_test"}}}

	ctx, cancel := context.WithCancel(t.Context())
	go func() {
		time.Sleep(50 * time.Millisecond) // let the first attempt fail once
		cancel()
	}()

	err := persistBatchWithRetry(ctx, writer, batch, 20, 20)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("persistBatchWithRetry() = %v, want %v", err, context.Canceled)
	}
	if writer.calls < 1 {
		t.Error("calls = 0, want at least 1 attempt before shutdown was observed")
	}
}
