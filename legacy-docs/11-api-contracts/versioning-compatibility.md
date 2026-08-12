# API Versioning & Compatibility

## API Versioning

Public APIs use major version namespaces:

```text
/api/v1
/api/v2
```

## Backward Compatibility

Within a major version:

- do not remove fields unexpectedly
- do not change field meaning
- do not change error semantics without documentation

Adding optional fields is generally backward-compatible.

## Event Schema

Event schemas are separately versioned.

```text
API version != event schema version
```

## SDK Compatibility

The backend must support telemetry from currently supported SDK versions.

## Deprecation

Deprecated APIs should have:

- documentation
- replacement
- deprecation timeline
- migration guidance

## Self-Hosted Reality

Customers may upgrade FrontWatch less frequently than SaaS customers.

Therefore compatibility windows must account for long-lived installations.
