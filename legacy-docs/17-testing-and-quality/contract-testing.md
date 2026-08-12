# Contract Testing

## API Contract

The API schema is the agreement between:

```text
frontend ↔ backend
SDK/ingestion ↔ ingestion API
integrations ↔ API
```

## Tests

Validate:

- required fields
- types
- enums
- error shapes
- pagination
- compatibility

## Event Contract

Telemetry events must remain compatible across SDK and backend versions.

## Compatibility

New backend versions should define how they handle older SDK event versions.

## Breaking Changes

Breaking contract changes require:

```text
versioning
migration
or compatibility window
```
