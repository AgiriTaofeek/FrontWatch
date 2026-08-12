# SDK Privacy & Redaction

Privacy is one of FrontWatch's most important differentiators for banking environments.

## Default Principle

```text
Do not collect what you do not need.
```

## Sensitive Data Examples

Never collect by default:

```text
passwords
authentication tokens
payment credentials
full form values
cookies
authorization headers
```

## Redaction Layers

```text
DOM/input filtering
        ↓
event field filtering
        ↓
URL normalization
        ↓
header filtering
        ↓
payload redaction
```

## Configuration

Potential configuration:

```ts
privacy: {
  redactUrls: true,
  redactHeaders: true,
  maskText: true,
  maskInputs: true
}
```

## Custom Rules

Organizations may need custom rules for banking-specific data.

Example conceptual rule:

```text
customerAccountNumber → [REDACTED]
```

## Fail Safe

If a privacy rule cannot be evaluated safely:

```text
drop data
```

rather than:

```text
send potentially sensitive data
```

## Server-Side Safety

The browser SDK must not accidentally execute browser-specific privacy/instrumentation logic during SSR.
