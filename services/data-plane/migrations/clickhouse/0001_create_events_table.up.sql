-- data-model.md §3's common envelope, minus the tenant IDs the SDK
-- never sends (project_id comes from the Kafka record key, not the
-- decoded event body — same "SDK never sends tenant IDs" rule as
-- ADR-022/packages/contracts, just showing up here as the worker's
-- responsibility to attach instead of ingestion's).
--
-- fingerprint/fingerprint_version: populated for fingerprintable event
-- types (error, for now), empty otherwise. payload stays the raw,
-- untouched original JSON — ADR-008: raw and derived data stay
-- conceptually and physically distinct, fingerprint is derived,
-- payload is raw evidence.
CREATE TABLE events
(
    event_id             String,
    project_id           String,
    event_type           LowCardinality(String),
    schema_version       UInt16,
    client_timestamp     DateTime64(3),
    server_received_at   DateTime64(3),
    release              String DEFAULT '',
    session_id           String DEFAULT '',
    route                String DEFAULT '',
    fingerprint           String DEFAULT '',
    fingerprint_version   UInt16 DEFAULT 0,
    payload               String
)
ENGINE = ReplacingMergeTree
PARTITION BY toDate(client_timestamp)
ORDER BY (project_id, event_type, client_timestamp, event_id);
