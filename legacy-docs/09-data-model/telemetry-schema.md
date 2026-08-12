# FrontWatch — Logical Telemetry Schema

## Common Envelope

Every event has a common envelope.

```text
event_id
schema_version
event_type

organization_id
application_id
environment_id
project_id

release_id?
session_id?

client_timestamp
server_received_at

route?
browser?
browser_version?
os?
device?

payload
```

## Error Event

```text
type: error

payload:
- message
- exception_type
- stack_trace
- fingerprint
- source_location
- mechanism
- handled
- metadata
```

## Network Event

```text
type: network

payload:
- method
- normalized_resource
- status
- duration_ms
- outcome
- error_type
```

Never collect sensitive request/response bodies by default.

## Performance Event

```text
type: performance

payload:
- metric_name
- value
- route
- navigation_type
- attribution
```

Examples:

```text
LCP
CLS
INP
FCP
navigation
resource
long_task
```

## Breadcrumb Event

```text
type: breadcrumb

payload:
- category
- message
- timestamp
- metadata
```

## Navigation Event

```text
type: navigation

payload:
- from_route
- to_route
- navigation_type
- duration
```

## Interaction Event

```text
type: interaction

payload:
- category
- target_type
- target_identifier
- timestamp
```

Sensitive input values are excluded.

## Schema Evolution

Every event contains:

```text
schema_version
```

The backend must maintain explicit compatibility rules.

## Event Size

The logical schema should enforce bounded payload sizes.

Large arbitrary blobs should not be allowed to enter the primary telemetry stream without an intentional design.
