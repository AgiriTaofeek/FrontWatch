# SDK — Privacy, Sampling & Security

**Status:** Draft · Consolidates: legacy `12-sdk-specification/privacy.md`, `sampling.md`, `security.md`, `source-maps.md`. This is one of FrontWatch's most important differentiators for banking/regulated environments — see `../../01-project/strategy.md` §3-4.

## Privacy & redaction

Default principle: **do not collect what you do not need.** Never collected by default: passwords, authentication tokens, payment credentials, full form values, cookies, authorization headers. Redaction layers, applied in order: DOM/input filtering → event field filtering → URL normalization → header filtering → payload redaction.

```ts
privacy: { redactUrls: true, redactHeaders: true, maskText: true, maskInputs: true }
```

Organizations can add custom rules for domain-specific sensitive data (e.g. `customerAccountNumber → [REDACTED]`). **Fail-safe rule: if a privacy rule cannot be evaluated safely, drop the data — never send potentially sensitive data because the redaction path failed.** The browser SDK must never accidentally execute browser-specific privacy/instrumentation logic during SSR.

## Sampling

Reduces network traffic, browser overhead, ingestion volume, and storage cost. Different event categories can have different policies (errors → high retention; performance/breadcrumbs → configurable; interactions → typically lower sampling). Session-aware sampling should keep related events useful together rather than sampling independently per event. **Sampling must never substitute for privacy filtering — the fixed order is capture → privacy → sampling, never the reverse** (same rule as the event pipeline in `core-architecture.md`). Expose reasonable configuration without overwhelming developers with dozens of low-level tuning knobs.

## Security

The SDK executes inside customer applications and shares the browser's security environment. Requirements: never expose ingestion secrets with excessive privilege · never collect credentials by default · safely handle untrusted application data · avoid unsafe DOM operations · avoid eval/dynamic code execution · use secure transport · protect configuration from accidental leakage. **A browser-visible project credential cannot be treated like a server secret** — it authorizes only the minimum required ingestion operations (see `../../05-architecture/security-architecture.md` §5). The SDK documents any CSP exceptions it requires. Dependencies are minimized; updates are reviewed for security, bundle size, and runtime behavior. The SDK cannot assume it controls the browser — a compromised application environment may alter SDK behavior, so **server-side validation remains mandatory regardless of client-side redaction.**

## Source maps & stack trace resolution

Production JS is minified/bundled/transformed, so raw stack traces are hard to investigate. Flow: `Production Error → minified stack → Release → source map → resolved source location`. Source maps are associated with a specific release. **Security: source maps can contain source code and must not be publicly exposed**, especially for banking/self-hosted customers — a build/deployment process uploads source maps directly to the customer's own FrontWatch instance. **Recommendation: resolve stack traces server-side and store source maps securely, so they never need to ship to browsers.**
