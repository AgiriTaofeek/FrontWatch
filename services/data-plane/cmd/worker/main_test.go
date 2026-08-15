package main

import (
	"testing"

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
