# SDK — Core Architecture

**Status:** Draft · Consolidates: legacy `12-sdk-specification/README.md`, `core-architecture.md`, `initialization.md`, `event-pipeline.md`, `buffering-transport.md`, `manual-api.md`, `ssr-ssg.md`. Product-level requirements → `03-business-analysis/user-stories/E03-sdk.md`. Design decisions → `../../decisions/ADR-005/006/007`.

The SDK is FrontWatch's front door: observe a frontend application with minimal performance impact, enforce privacy as early as possible, and reliably deliver telemetry. **Primary design principle: the application being monitored is more important than the monitoring SDK — `SDK failure ≠ application failure`** (ADR-006).

## Module layout

```
core/
├── client       owns lifecycle and configuration
├── context      application, environment, release, session, route, browser, device
├── event        converts instrumentation output into the common event envelope
├── privacy      sanitize/redact — runs before sampling, always
├── sampling
├── buffer       bounded memory, FIFO, flush thresholds, shutdown flushing
├── transport    batching, compression, requests, retry, backoff, failure handling
├── session
├── errors / network / performance / navigation / breadcrumbs   (instrumentation integrations, modular)
```

## Initialization

```ts
import { init } from "@frontwatch/sdk";
init({ dsn: "...", environment: "production", release: "2026.08.11" });
```

Responsibilities, in order: validate configuration → create client → establish context → configure privacy → configure sampling → register instrumentation → start buffering/transport → start session tracking where enabled. **Must be cheap** — no expensive synchronous work during application startup. Duplicate `init()` calls need deterministic, documented behavior (ignore / warn / return existing client). Invalid configuration must never crash the application — expose diagnostics in development, never leak secrets in production. Configurable: dsn/project key, environment, release, sample rate, privacy rules, enabled integrations, debug mode, transport, buffer limits.

## Event pipeline

`Browser signal → Instrumentation → Create event → Attach context → Privacy filtering → Sampling → Buffer → Batch → Transport → Ingestion`

**Order matters: privacy filtering always happens before sampling, which happens before buffering** (ADR-007) — an event that shouldn't leave the browser must never get a chance to be "sampled in" first. Context auto-attached where available: release, environment, route, session, browser, device. Delivery outcome states the SDK must distinguish: accepted / rejected / retryable / permanently failed.

## Buffering & transport

Bounded in-memory buffer (FIFO or documented prioritization, configurable max events/bytes, flush timer, immediate flush on critical lifecycle events). Batch many events into one request rather than one-request-per-event. Retry only failures likely to succeed later, bounded exponential backoff — **never retry forever**; if FrontWatch is unavailable: bounded retries → drop/expire. Use browser lifecycle mechanisms to flush pending telemetry without blocking navigation. Optional short-lived offline buffering is allowed only with strict limits given its privacy implications. Compressed batches where supported.

## Manual API (intentionally small public surface)

```ts
frontwatch.captureException(error)
frontwatch.captureMessage("Checkout started")
frontwatch.addBreadcrumb({ category: "checkout", message: "Checkout started" })
frontwatch.setContext("checkout", { step: "payment" })
frontwatch.setUser({ id: "customer_opaque_id" })   // pseudonymous ID only, never raw PII
await frontwatch.flush()
frontwatch.close()
```

All manual-API values pass through the same privacy rules as automatic telemetry — the manual API must not become a backdoor for shipping secrets.

## SSR / SSG / SPA / hybrid behavior

**Core rule: browser instrumentation executes only in a browser-capable context.** During SSR, server code never initializes browser SDK instrumentation; it initializes on client hydration. SSG-generated HTML never requires the SDK at build time — only at runtime in the browser. SPA: initialize once per application runtime, route changes captured via router integrations. Hybrid frameworks (Next.js, Nuxt, SvelteKit, Remix, React Router, TanStack Start, SolidStart) need explicit browser/client entry points to avoid the common failure of a server import pulling in a browser-only module and breaking the build/runtime.
