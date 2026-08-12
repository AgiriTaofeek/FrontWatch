# ADR-007 — Redact/Filter Sensitive Data Before Transmission, in the Browser, Where Technically Possible

## Status
Accepted

## Decision
Perform filtering and redaction in the browser (client-side, in the SDK) whenever technically possible, before telemetry ever leaves the customer application boundary — rather than relying solely on server-side redaction after ingestion.

## Rationale
Data should ideally never leave the customer application boundary unnecessarily. This is stronger than "we redact it once it reaches our servers" — it minimizes what's ever transmitted or exposed in transit at all, which matters specifically for the regulated-industry target market (`01-project/strategy.md` §3).

## Consequence
Redaction failures must fail closed for protected fields (see `03-business-analysis/user-stories/E03-sdk.md` US-03.04). Server-side validation and redaction (ADR for defense in depth) still applies on top of this — client-side redaction is the first layer, not the only one.
