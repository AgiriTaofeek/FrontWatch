# SDK Security Requirements

## Threat Model

The SDK executes inside customer applications and therefore shares the browser's security environment.

## Requirements

- never expose ingestion secrets with excessive privilege
- never collect credentials by default
- safely handle untrusted application data
- avoid unsafe DOM operations
- avoid eval/dynamic code execution
- use secure transport
- protect configuration from accidental leakage

## Ingestion Credential

A browser-visible project credential cannot be treated like a server secret.

It should authorize only the minimum required ingestion operations.

## CSP

The SDK should be compatible with common Content Security Policies and document any required exceptions.

## Supply Chain

SDK dependencies should be minimized.

Dependency updates must be reviewed for:

- security
- bundle size
- runtime behavior

## Tamper Resistance

The SDK cannot assume it controls the browser.

A compromised application environment may alter SDK behavior.

Server-side validation remains mandatory.
