# ADR-009 — Prefer Idempotent Event Processing Over Assuming Exactly-Once Delivery

## Status
Accepted

## Decision
Design event processing to tolerate duplicate delivery. Prefer **at-least-once delivery + idempotent processing** over attempting to guarantee exactly-once delivery end to end.

## Rationale
Distributed systems cannot safely assume perfect delivery — a worker may process the same queue message more than once, and network retries can produce duplicate telemetry. Attempting true exactly-once semantics across SDK → ingestion → queue → worker → storage adds significant complexity for a guarantee that's rarely fully achievable anyway.

## Consequence
`event_id` is the idempotency/deduplication key. Issue creation must not create duplicate issues for the same fingerprint/application scope on reprocessing. Aggregations must tolerate retries or use mechanisms that make repeated processing safe. See `05-architecture/data-model.md` §9.
