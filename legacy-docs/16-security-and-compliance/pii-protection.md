# PII Protection

## Goal

Prevent FrontWatch from becoming an unnecessary repository of personally identifiable information.

## SDK Defaults

Do not capture by default:

```text
passwords
payment credentials
authorization headers
cookies
full form values
```

## User Identity

Prefer opaque/pseudonymous identifiers.

## Custom Data

Developers must understand that custom context can contain sensitive information.

Documentation should strongly discourage placing:

```text
passwords
tokens
financial credentials
government IDs
```

into telemetry.

## Redaction

Provide configurable rules for:

```text
headers
URLs
query parameters
input fields
metadata
breadcrumbs
```

## Failure-Safe

If a redaction rule fails unexpectedly, prefer dropping the sensitive field/event rather than sending it.
