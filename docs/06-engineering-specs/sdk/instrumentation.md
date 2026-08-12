# SDK — Instrumentation

**Status:** Draft · Consolidates: legacy `12-sdk-specification/errors.md`, `session.md`, `network.md`, `performance.md`, `breadcrumbs.md`, `navigation.md`, `framework-matrix.md`

## Errors

Automatic capture: uncaught exceptions, unhandled promise rejections, resource loading failures, framework error boundaries. Captured fields: message, exception type, stack trace, handled state, route, release, environment, session, timestamp, and source context where available (filename, line, column, function). The backend owns final issue grouping, but the SDK can provide useful fingerprint inputs. Framework adapters add richer detail (React error boundary, Vue error handler, Svelte error handling). Global handlers and framework instrumentation must coordinate to avoid double-reporting the same failure.

## Network

Instruments `fetch`, `XMLHttpRequest`, and navigation/resource timing. Captures safe metadata only: method, normalized resource, status, duration, timestamp, outcome. **Never captured by default:** authorization headers, cookies, request/response bodies, passwords, payment data. Dynamic URLs are normalized (`/api/users/123` → `/api/users/:id`) to avoid treating every ID as a distinct high-cardinality resource. Failed requests correlate with current route, session, release, and active issue. Instrumentation must preserve exact application semantics — it must never alter request/response/promise/error behavior, for fetch or XHR alike.

**RPC/server-function calls must be labeled, not shown as raw generated IDs.** TanStack Start compiles `await myServerFn()` into an actual `fetch` to an auto-generated function-ID endpoint (e.g. `/_serverFn/a1b2c3`) — that request is captured like any other network call, but a raw generated ID is useless during investigation. The adapter must recognize these endpoint shapes and resolve them back to the function's declared name (e.g. display `Server Function: getUserAccount`, not the generated path). Same principle applies to React Router's client-side data-fetch requests for loaders (the "single fetch" data endpoint) — label by route/loader name, not raw path. **Don't rely on URL pattern-matching alone to detect these** — see §Verified wire protocol details below for the request header each framework actually sets, which is a more reliable signal than a path prefix that's configurable in both frameworks. Framework-internal requests that aren't the developer's API calls at all (React Router's route-manifest/"fog of war" discovery request) must also be recognized and excluded from being shown as if they were application API traffic.

## Performance

Metrics: LCP, CLS, INP, FCP, TTFB, navigation timing, resource timing, long tasks. Navigation capture: navigation start, route, navigation type, duration. Long tasks capture start, duration, route/session context — used to spot main-thread blocking. **The instrumentation must itself be measured** — it must not significantly distort the metrics it's trying to observe. Strong candidate for configurable sampling. Attribution context attached where practical: route, resource, navigation, release, browser, device.

## Breadcrumbs

Categories: navigation, interaction, network, error, performance, custom. Example trail: `Navigation → /accounts` · `Network → GET /api/accounts → 200` · `Interaction → button` · `Network → GET /api/profile → 500` · `Error → TypeError`. Storage is bounded (last N breadcrumbs). Breadcrumb messages/metadata are untrusted/sensitive-capable — same privacy rules as any other telemetry apply. Custom breadcrumbs (`frontwatch.addBreadcrumb(...)`) must not become a place developers casually put secrets.

## Navigation

Captures client-side route transitions (SPA) and full-page navigation timing/context. Prefer normalized route identities (`/accounts/123` → `/accounts/:accountId`). Event shape: `{event_type: "navigation", from_route, to_route, navigation_type}`. Each router integration translates framework-specific navigation events into this common representation. Query strings are never blindly captured — URL normalization and configurable query-parameter filtering are required, since query strings frequently carry sensitive data.

## Session tracking

Lifecycle: `session_start → events → events → session_end/timeout`. The SDK generates or obtains a stable opaque session ID that must not directly encode sensitive customer information. Session capture is configurable/sampleable. Must correctly handle SPA navigation, full page navigation, reload, and multi-tab behavior. Session IDs must never be generated in a server-side execution context (SSR).

## Framework support matrix

| Framework | SPA | SSR | SSG | Adapter |
|---|---:|---:|---:|---|
| **React** *(Tier 1)* | Yes | Via host | Via host | React |
| **React Router** *(Tier 1)* | Yes (Library/Data mode, or Framework mode with `ssr: false`) | Yes — Framework mode, `ssr: true` (default) | Via prerender config | React Router |
| **TanStack Start** *(Tier 1)* | Yes — per-route `ssr: false` | Yes — per-route, **three modes**: `true` (SSR+hydrate), `"data-only"` (loader server-side, component client-only), `false` | Depends | TanStack |
| Next.js | Yes | Yes | Yes | Next |
| Remix | Yes | Yes | Depends | Remix |
| SolidStart | Yes | Yes | Depends | SolidStart |
| Vue | Yes | Via host | Via host | Vue |
| Nuxt | Yes | Yes | Yes | Nuxt |
| Svelte | Yes | Via host | Via host | Svelte |
| SvelteKit | Yes | Yes | Yes | SvelteKit |
| Solid | Yes | Via host | Via host | Solid |

The **React adapter is not separate work from React Router/TanStack Start** — both of those sit on top of React, so the error-boundary integration, lifecycle hooks, and rendering instrumentation built for either one *is* the React adapter (component-level capture is identical; only the routing/SSR layer around it differs). It ships as part of the same Tier 1 effort, not after it.

Each adapter handles framework initialization, route integration, error integration, lifecycle integration, and the SSR/client boundary — **the core SDK stays framework-independent** (ADR-005); none of this logic duplicates into the core. Rollout order and rationale → `../../02-product/mvp.md` §5.

### React Router and TanStack Start — the server-execution boundary in detail

These two lead the rollout specifically because their SSR toggles are the most flexible in the target list, which makes their browser/server boundary the hardest version of the problem the SDK has to solve:

- **React Router Loaders and Actions** run on the server in Framework mode. The SDK must never initialize browser-only instrumentation (DOM access, `window`, breadcrumb/session state) inside a loader or action — only the adapter's server-safe context extraction (route, params) may run there. Client-side instrumentation initializes on hydration, same as any other SSR framework (`core-architecture.md` §SSR/SSG/SPA/hybrid behavior).
- **TanStack Start's `"data-only"` mode is the case that actually breaks a naive SSR/SPA binary check.** The loader executes server-side (so server-side code paths run), but the component renders entirely client-side (so there's no server-rendered HTML to hydrate into — it's a client-only paint fed by server-fetched data). The adapter must treat this as neither "SSR" nor "SPA" for the purposes of navigation-timing and performance capture: navigation timing should follow the SPA/client-render path, while any server-side context the loader captured must still be threaded through to the client for correlation.
- **TanStack Start Server Functions** are RPCs, not page renders — the adapter must correlate a server function call with the session/route that triggered it (much like a network request) without incorrectly treating the function's server-side execution as a route navigation or a fresh page load.

Framework compatibility test coverage for these two must explicitly include the `data-only` case and at least one Server Function round trip, not just the `true`/`false` SSR extremes — see `../../07-delivery/test-strategy.md` §Framework compatibility testing.

### Verified wire protocol details (for adapter implementers)

The following was confirmed by reading the framework source directly (`remix-run/react-router` and `TanStack/router`, both at HEAD at time of writing), not just the docs — these are the actual signals the adapters key off, and they matter because URL shape alone is not a reliable way to detect either kind of request.

**TanStack Start server functions:**
- Every server-function request carries the request header **`x-tsr-serverFn: true`** — this is the reliable detection signal, not the URL. The default endpoint base is `/_serverFn/` + a generated function ID, but the base path is configurable (`serverFns.base`), so URL matching alone will silently break for any customer who changes it.
- `GET`-method server functions serialize their arguments **into the URL's query string**, not the body. This is a real privacy consideration on top of the general query-string redaction rule in §Navigation below — server function *arguments* can end up in a URL the same way any other query parameter can, and the existing configurable query-parameter filtering must apply to these endpoints too, not just customer-authored API routes.
- `POST`-method server functions carry a serialized JSON or `FormData` body — excluded from capture by the existing no-request-body-by-default rule, no special handling needed.
- Response headers `x-tss-serialized` and `x-tss-raw` indicate how the response is encoded; a content-type of `application/x-tss-framed` means the response is a **streamed, multi-chunk payload** (it can carry async/streamed values, not just a single JSON blob). **Known limitation:** because the SDK never reads response bodies (privacy rule), request duration is measured as time-to-response-headers, not time-to-full-stream-completion — for a framed/streaming server function response, this can under-report how long the customer's code was actually still receiving data. Worth a documented caveat in the dashboard rather than a silent inaccuracy.
- Redirects and "not found" results from a server function can be encoded as **JSON markers inside the response payload** (`isSerializedRedirect`, `isNotFound`) rather than always surfacing as a distinct HTTP status. **Known limitation:** since the SDK classifies outcome from status code and doesn't parse bodies, a semantic redirect/not-found returned this way may be recorded as a plain 2xx success. This should be called out as a documented limitation of network-outcome classification for TanStack Start server functions specifically, not silently treated as solved.

**React Router (Framework Mode):**
- Client-side navigation data requests append **`.data` to the route path** (e.g. `/accounts/123.data`) — this is the request to label as loader/action data, not raw application API traffic.
- Redirect/revalidation signaling uses custom response headers: `X-Remix-Redirect`, `X-Remix-Status`, `X-Remix-Revalidate`, `X-Remix-Reload-Document`, `X-Remix-Replace`; the presence of an `X-Remix-Response` header is part of how the framework itself distinguishes "a handled framework response" from a generic failure on 4xx+.
- Response bodies use **turbo-stream encoding**, which — like TanStack's framed responses — supports streamed/deferred values. Same duration-measurement caveat applies: a `defer()`-based loader response can keep streaming well after headers arrive.
- A separate, distinct internal request exists purely for **lazy route discovery ("fog of war")**: a request to `/__manifest` (default path) fetches route metadata for parts of the app not yet loaded. This is not a `.data` request and is not application API traffic either — it needs its own recognized category (something like "Framework: route discovery"), or it will show up as unexplained, unlabeled noise in every investigation view for any app using the (default-on) lazy route discovery feature.

Sources: [TanStack Start — Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [TanStack Start — Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr), [React Router — Lazy Route Discovery](https://reactrouter.com/explanation/lazy-route-discovery), and direct inspection of `packages/start-client-core/src/client-rpc/`, `packages/router-core/src/{redirect,not-found}.ts` in `TanStack/router`, and `packages/react-router/lib/server-runtime/{server,single-fetch}.ts` in `remix-run/react-router`.

### The observability boundary inside a server function (or loader)

A server function's own execution is not one hop — it's commonly two, and only the first is observable:

```
Browser → [RPC call to server function endpoint] → TanStack Start server
                                                          │
                                                          └─→ [server-to-server call] → a separate backend API
```

**Hop 1 (browser → the app's own TanStack Start/React Router server) is fully observable** — it's a real `fetch` from the browser's perspective, captured like any network request, labeled per the rule above.

**Hop 2 (that server → a separate backend API, or any other service the server function calls out to) is not observable in MVP.** It executes entirely server-side, in a runtime the browser SDK has no presence in — this is the same boundary as `01-project/charter.md`'s non-goal *"not a full APM/infrastructure-monitoring replacement (may correlate with backend, won't replace it)"*, just encountered one layer earlier than "the actual backend," because the framework's own server is backend code even though it ships in the same repository as the frontend.

**What this means in practice:** the duration of hop 1 includes however long hop 2 took, so a slow or failing backend call still shows up as a slow/failing server-function request, correctly correlated to session, route, and release — you just can't decompose *why* from FrontWatch alone. That decomposition is what the customer's own backend tracing (OpenTelemetry or similar) provides; correlating FrontWatch's browser-side trace with that backend trace (e.g. by passing a shared trace/correlation ID through the RPC call) is a plausible V2+ capability, not MVP — see `01-project/strategy.md` §7.

The same two-hop reality applies to React Router Loaders/Actions when they call out to a separate backend, with one wrinkle: an **initial SSR page load runs the loader server-side before any HTML reaches the browser**, so it isn't a discrete network entry at all — it's folded into the one document request, visible only as part of TTFB/navigation timing, not as a separately measurable "loader took Xms." Only *client-side* navigations (which fetch loader data via the single-fetch data endpoint) are visible as their own network event.
