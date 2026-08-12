# SDK — Performance Budget, Testing, Versioning & DX

**Status:** Draft · Consolidates: legacy `12-sdk-specification/performance-budget.md`, `testing.md`, `versioning-release.md`, `developer-experience.md`

## Performance budget

The SDK is part of the customer's frontend, so it needs explicit budgets, not aspirational ones:

| Category | Track |
|---|---|
| JavaScript | minified size, compressed size, initialization cost |
| CPU | startup CPU, instrumentation overhead, event serialization, stack processing |
| Memory | idle memory, maximum buffer memory, session tracking memory |
| Network | requests per page, bytes per page, average batch size |

Measure via `application without SDK` vs. `application with SDK`, across representative applications. **No feature is added to the SDK without understanding its runtime cost.** Performance budgets run in CI for every release candidate — this is a regression gate, not a one-time benchmark (see `../../01-project/problem.md` §7, assumption A11).

## Testing strategy

Unit: event creation, context, privacy, sampling, buffering, retry logic, normalization. Browser integration: error capture, fetch/XHR instrumentation, navigation, performance, session lifecycle. Framework tests: each adapter needs its own suite. SSR tests verify the build succeeds, SSR runtime never executes browser-only code, and client hydration initializes correctly. Failure tests simulate network unavailable, ingestion unavailable, malformed configuration, full buffer, storage unavailable, missing browser API. Performance tests track overhead against the defined budgets above. Compatibility matrix tests representative versions of each supported framework. Security tests cover redaction, sensitive headers, URL filtering, payload limits, malicious metadata.

## Versioning & release

Semantic versioning (`MAJOR.MINOR.PATCH`). Breaking changes: public API removal, incompatible configuration, event contract incompatibility, major behavior change. **SDK version and event schema version are independently versioned** (same principle as `../../05-architecture/api-contracts.md` §4/12). Framework adapters can share a major/minor line while still releasing independently when needed. Release channels: stable, beta, canary. The backend supports a defined range of SDK versions (compatibility policy, not "latest only"). Releases are reversible via package version pinning. Every release states changes, breaking changes, performance impact, privacy impact, and migration requirements explicitly.

## Developer experience

Target flow: `install package → initialize SDK → deploy → see first event`. Post-init, the SDK should make it easy to verify SDK loaded / project recognized / environment recognized / release recognized / telemetry delivered — this is the SDK-level half of the onboarding workflow in `../../04-ux-ui/workflows/onboarding.md`. Development-only debug mode can show event captured/dropped/sampled/queued/sent — **never prints sensitive telemetry, even in debug mode.** Strong TypeScript types on the public SDK. Every supported framework gets documentation for installation, initialization, SSR/SSG instructions, source maps, privacy, manual capture, and troubleshooting. Configuration errors are actionable — not "Initialization failed" but "FrontWatch project key is missing. Add it to the client initialization configuration."
