# API Security

## Requirements

Protect against:

```text
broken access control
injection
SSRF
request smuggling where applicable
XSS
CSRF where applicable
resource exhaustion
credential abuse
```

## Input

Validate:

- types
- lengths
- enums
- identifiers
- time ranges
- pagination
- filters

## Queries

Never concatenate user input into database queries.

## Query Abuse

Apply:

- maximum time range
- query timeout
- result limits
- rate limits
- concurrency limits where needed

## SSRF

Any feature that fetches customer-configured URLs must use explicit SSRF controls.

## Error Responses

Do not expose stack traces, SQL, credentials, or internal infrastructure details.
