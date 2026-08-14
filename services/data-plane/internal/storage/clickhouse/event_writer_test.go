package clickhouse

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

// Integration test — hits the real local ClickHouse, same pattern as
// internal/storage/postgres. Skips cleanly if CLICKHOUSE_ADDR isn't set.
func TestEventWriter_WriteEvent(t *testing.T) {
	addr := os.Getenv("CLICKHOUSE_ADDR")
	if addr == "" {
		t.Skip("CLICKHOUSE_ADDR not set, skipping ClickHouse integration test")
	}

	conn, err := NewConnection(addr,
		os.Getenv("CLICKHOUSE_DATABASE"),
		os.Getenv("CLICKHOUSE_USERNAME"),
		os.Getenv("CLICKHOUSE_PASSWORD"),
	)
	if err != nil {
		t.Fatalf("NewConnection() = %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	writer := NewEventWriter(conn)

	eventID := "evt_ch_test_" + time.Now().Format(time.RFC3339Nano)
	stored := StoredEvent{
		Event: telemetry.Event{
			EventID:       eventID,
			EventType:     telemetry.EventTypeError,
			SchemaVersion: 1,
			Timestamp:     time.Now().UTC().Truncate(time.Millisecond),
			Release:       "2026.08.14",
			SessionID:     "sess_ch_test",
			Route:         "/dashboard",
			ErrorPayload: &telemetry.ErrorPayload{
				Message:       "clickhouse integration test",
				ExceptionType: "TestError",
				Handled:       false,
			},
		},
		ProjectID:          "proj_ch_test",
		ServerReceivedAt:   time.Now().UTC().Truncate(time.Millisecond),
		Fingerprint:        "abc123",
		FingerprintVersion: 1,
	}

	ctx := context.Background()
	if err := writer.WriteEvent(ctx, stored); err != nil {
		t.Fatalf("WriteEvent() = %v", err)
	}
	t.Cleanup(func() {
		_ = conn.Exec(context.Background(), "ALTER TABLE events DELETE WHERE event_id = ?", eventID)
	})

	// ReplacingMergeTree doesn't merge duplicates synchronously, but a
	// freshly-inserted row is visible immediately to a plain SELECT —
	// only *deduplication* is eventual, not visibility.
	row := conn.QueryRow(ctx, `
		SELECT project_id, event_type, fingerprint, payload
		FROM events WHERE event_id = ?`, eventID)

	var (
		gotProjectID   string
		gotEventType   string
		gotFingerprint string
		gotPayload     string
	)
	if err := row.Scan(&gotProjectID, &gotEventType, &gotFingerprint, &gotPayload); err != nil {
		t.Fatalf("querying written event: %v", err)
	}

	if gotProjectID != stored.ProjectID {
		t.Errorf("project_id = %q, want %q", gotProjectID, stored.ProjectID)
	}
	if gotEventType != string(telemetry.EventTypeError) {
		t.Errorf("event_type = %q, want %q", gotEventType, telemetry.EventTypeError)
	}
	if gotFingerprint != stored.Fingerprint {
		t.Errorf("fingerprint = %q, want %q", gotFingerprint, stored.Fingerprint)
	}
	if gotPayload == "" {
		t.Error("payload = empty, want the marshaled error payload")
	}
}

// TestEventWriter_WriteEvent_NetworkEvent covers the write path for the
// other Event variant — PayloadJSON()'s switch has two branches, and
// only the error one was exercised above.
func TestEventWriter_WriteEvent_NetworkEvent(t *testing.T) {
	addr := os.Getenv("CLICKHOUSE_ADDR")
	if addr == "" {
		t.Skip("CLICKHOUSE_ADDR not set, skipping ClickHouse integration test")
	}

	conn, err := NewConnection(addr,
		os.Getenv("CLICKHOUSE_DATABASE"),
		os.Getenv("CLICKHOUSE_USERNAME"),
		os.Getenv("CLICKHOUSE_PASSWORD"),
	)
	if err != nil {
		t.Fatalf("NewConnection() = %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	writer := NewEventWriter(conn)

	eventID := "evt_ch_net_test_" + time.Now().Format(time.RFC3339Nano)
	stored := StoredEvent{
		Event: telemetry.Event{
			EventID:       eventID,
			EventType:     telemetry.EventTypeNetwork,
			SchemaVersion: 1,
			Timestamp:     time.Now().UTC().Truncate(time.Millisecond),
			SessionID:     "sess_ch_net_test",
			Route:         "/dashboard",
			NetworkPayload: &telemetry.NetworkPayload{
				Method:     "GET",
				Resource:   "/api/users/:id",
				Status:     200,
				DurationMs: 42.5,
				Outcome:    "success",
			},
		},
		ProjectID:        "proj_ch_net_test",
		ServerReceivedAt: time.Now().UTC().Truncate(time.Millisecond),
	}

	ctx := context.Background()
	if err := writer.WriteEvent(ctx, stored); err != nil {
		t.Fatalf("WriteEvent() = %v", err)
	}
	t.Cleanup(func() {
		_ = conn.Exec(context.Background(), "ALTER TABLE events DELETE WHERE event_id = ?", eventID)
	})

	row := conn.QueryRow(ctx, `
		SELECT event_type, payload
		FROM events WHERE event_id = ?`, eventID)

	var gotEventType, gotPayload string
	if err := row.Scan(&gotEventType, &gotPayload); err != nil {
		t.Fatalf("querying written event: %v", err)
	}

	if gotEventType != string(telemetry.EventTypeNetwork) {
		t.Errorf("event_type = %q, want %q", gotEventType, telemetry.EventTypeNetwork)
	}
	if !strings.Contains(gotPayload, `"resource":"/api/users/:id"`) {
		t.Errorf("payload = %q, want it to contain the network payload's resource", gotPayload)
	}
}

// TestEventWriter_WriteEvent_PerformanceEvent covers the write path for
// the third Event variant — PayloadJSON()'s switch now has three
// branches.
func TestEventWriter_WriteEvent_PerformanceEvent(t *testing.T) {
	addr := os.Getenv("CLICKHOUSE_ADDR")
	if addr == "" {
		t.Skip("CLICKHOUSE_ADDR not set, skipping ClickHouse integration test")
	}

	conn, err := NewConnection(addr,
		os.Getenv("CLICKHOUSE_DATABASE"),
		os.Getenv("CLICKHOUSE_USERNAME"),
		os.Getenv("CLICKHOUSE_PASSWORD"),
	)
	if err != nil {
		t.Fatalf("NewConnection() = %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	writer := NewEventWriter(conn)

	eventID := "evt_ch_perf_test_" + time.Now().Format(time.RFC3339Nano)
	stored := StoredEvent{
		Event: telemetry.Event{
			EventID:       eventID,
			EventType:     telemetry.EventTypePerformance,
			SchemaVersion: 1,
			Timestamp:     time.Now().UTC().Truncate(time.Millisecond),
			SessionID:     "sess_ch_perf_test",
			Route:         "/dashboard",
			PerformancePayload: &telemetry.PerformancePayload{
				MetricName:     "LCP",
				Value:          1800,
				Rating:         "good",
				NavigationType: "navigate",
			},
		},
		ProjectID:        "proj_ch_perf_test",
		ServerReceivedAt: time.Now().UTC().Truncate(time.Millisecond),
	}

	ctx := context.Background()
	if err := writer.WriteEvent(ctx, stored); err != nil {
		t.Fatalf("WriteEvent() = %v", err)
	}
	t.Cleanup(func() {
		_ = conn.Exec(context.Background(), "ALTER TABLE events DELETE WHERE event_id = ?", eventID)
	})

	row := conn.QueryRow(ctx, `
		SELECT event_type, payload
		FROM events WHERE event_id = ?`, eventID)

	var gotEventType, gotPayload string
	if err := row.Scan(&gotEventType, &gotPayload); err != nil {
		t.Fatalf("querying written event: %v", err)
	}

	if gotEventType != string(telemetry.EventTypePerformance) {
		t.Errorf("event_type = %q, want %q", gotEventType, telemetry.EventTypePerformance)
	}
	if !strings.Contains(gotPayload, `"metric_name":"LCP"`) {
		t.Errorf("payload = %q, want it to contain the performance payload's metric_name", gotPayload)
	}
}
