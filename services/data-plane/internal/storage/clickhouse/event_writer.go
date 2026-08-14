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

func (w *EventWriter) WriteEvent(ctx context.Context, e StoredEvent) error {
	payload, err := e.Event.PayloadJSON()
	if err != nil {
		return fmt.Errorf("marshaling payload: %w", err)
	}

	return w.conn.Exec(ctx, `
		INSERT INTO events (
			event_id, project_id, event_type, schema_version,
			client_timestamp, server_received_at,
			release, session_id, route,
			fingerprint, fingerprint_version, payload
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
	)
}
