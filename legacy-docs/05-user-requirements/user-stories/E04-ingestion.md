# E04 — Telemetry Ingestion

## US-04.01 — Ingest Events
**Priority:** P0

**As an** FrontWatch platform,  
**I want** to receive telemetry from monitored applications,  
**so that** events can be processed and investigated.

### Acceptance Criteria
- Valid events are accepted.
- Events are associated with the correct organization/application/environment.
- Invalid events are rejected safely.
- Ingestion failures do not corrupt accepted telemetry.

## US-04.02 — Validate Events
**Priority:** P0

**As an** FrontWatch platform,  
**I want** to validate incoming event schemas,  
**so that** malformed data does not corrupt downstream systems.

### Acceptance Criteria
- Required fields are validated.
- Data types are validated.
- Payload limits are enforced.
- Invalid payloads receive an appropriate failure response.

## US-04.03 — Protect Ingestion
**Priority:** P0

**As a** DevOps engineer,  
**I want** ingestion protected from abuse and overload,  
**so that** one client cannot destabilize the platform.

### Acceptance Criteria
- Rate limits can be enforced.
- Oversized requests are rejected.
- Invalid project credentials cannot write telemetry.
- Ingestion remains available under expected peak load.

## US-04.04 — Monitor Ingestion
**Priority:** P0

**As a** DevOps engineer,  
**I want** ingestion health metrics,  
**so that** I know whether FrontWatch is receiving telemetry correctly.

### Acceptance Criteria
- Received event volume is measurable.
- Rejected event volume is measurable.
- Processing latency is measurable.
- Internal ingestion failures are observable.
