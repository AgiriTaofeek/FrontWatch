// Package clickhouse is the worker's write path for raw telemetry.
// Query-oriented, not a generic store — services.md's rule against
// pretending ClickHouse is a CRUD database applies here same as
// Postgres: this package does exactly one thing, write a decoded
// event, nothing more.
package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

func NewConnection(addr, database, username, password string) (driver.Conn, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: database,
			Username: username,
			Password: password,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("opening clickhouse connection: %w", err)
	}
	return conn, nil
}

type EventWriter struct {
	conn driver.Conn
}

func NewEventWriter(conn driver.Conn) *EventWriter {
	return &EventWriter{conn: conn}
}

// StoredEvent is what actually gets written — the decoded wire Event
// plus everything the worker adds during processing: project_id (from
// the Kafka record key, not the JSON body — the SDK never sends
// tenant IDs, ADR-022's rule extends here), server_received_at (from
// the Kafka record's own timestamp — see PROGRESS.md's Step 5 note on
// why this doesn't need an ingestion change), and the computed
// fingerprint.
type StoredEvent struct {
	Event              telemetry.Event
	ProjectID          string
	ServerReceivedAt   time.Time
	Fingerprint        string
	FingerprintVersion uint16
}

// WriteEvent persists exactly one event — a thin wrapper over
// WriteBatch, not a separately-maintained INSERT, so the two paths
// can never drift out of sync with each other. Kept (rather than
// removed in favor of always batching) because some callers — a
// future dead-letter replay tool, this package's own tests — really
// do just have one event, and a one-row PrepareBatch/Append/Send round
// trip is the correct way to write it, not a special case.
func (w *EventWriter) WriteEvent(ctx context.Context, e StoredEvent) error {
	return w.WriteBatch(ctx, []StoredEvent{e})
}

// WriteBatch persists a slice of events in one ClickHouse round trip
// via the native batch protocol (PrepareBatch/Append/Send) — real load
// testing (PROGRESS.md's Step 9 Load testing entry) found the previous
// one-INSERT-per-event path capped the worker's steady-state
// processing throughput at roughly 220-250 events/sec, far below
// ingestion's demonstrated 1000+ events/sec, so a real traffic spike
// left the queue growing unboundedly for over 15 minutes. ClickHouse's
// own guidance is explicit that infrequent, larger inserts are the
// correct usage pattern for a MergeTree-family table — many small
// single-row inserts is a known anti-pattern (each one creates a new
// part the background merge process then has to reconcile), not
// specific to this schema.
//
// All-or-nothing by design: if any row fails to Append or the final
// Send fails, no partial batch is committed — cmd/worker's caller
// leaves the whole batch's offsets uncommitted so Kafka redelivers all
// of it, same "never commit past an unpersisted record" guarantee the
// previous one-record-at-a-time path had, just applied to N records
// instead of 1. A larger batch means more rows are potentially
// reprocessed on a persist failure, but that was already a possible
// outcome (redelivery after a crash mid-fetch), and ReplacingMergeTree
// (0001_create_events_table.up.sql) already de-duplicates by
// (project_id, event_type, client_timestamp, event_id) on merge — this
// doesn't introduce a new correctness risk, only changes how many rows
// a rare retry re-inserts before that merge happens.
func (w *EventWriter) WriteBatch(ctx context.Context, events []StoredEvent) error {
	if len(events) == 0 {
		return nil
	}

	batch, err := w.conn.PrepareBatch(ctx, `
		INSERT INTO events (
			event_id, project_id, event_type, schema_version,
			client_timestamp, server_received_at,
			release, session_id, route,
			fingerprint, fingerprint_version, payload
		)`)
	if err != nil {
		return fmt.Errorf("preparing batch: %w", err)
	}

	for _, e := range events {
		payload, err := e.Event.PayloadJSON()
		if err != nil {
			return fmt.Errorf("marshaling payload for event %s: %w", e.Event.EventID, err)
		}

		if err := batch.Append(
			e.Event.EventID,
			e.ProjectID,
			string(e.Event.EventType),
			e.Event.SchemaVersion,
			e.Event.Timestamp,
			e.ServerReceivedAt,
			e.Event.Release,
			e.Event.SessionID,
			e.Event.Route,
			e.Fingerprint,
			e.FingerprintVersion,
			string(payload),
		); err != nil {
			return fmt.Errorf("appending event %s to batch: %w", e.Event.EventID, err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("sending batch of %d events: %w", len(events), err)
	}
	return nil
}
