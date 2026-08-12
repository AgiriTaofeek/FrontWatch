# E08 — Network Monitoring

## US-08.01 — Capture Network Requests
**Priority:** P0

**As a** software engineer, **I want** frontend network activity captured, **so that** API failures can be correlated with frontend failures.

**Acceptance criteria:** supported requests can be observed · URL, method, status, and duration are available where permitted · request bodies and sensitive headers are not captured by default · network capture does not break requests · **RPC/server-function calls (e.g. TanStack Start server functions, React Router loader data requests) are labeled by their declared name, not shown as raw generated endpoint IDs** — detected via the framework's actual request marker (e.g. TanStack Start's `x-tsr-serverFn` header), not URL pattern-matching alone, since the endpoint path prefix is configurable · framework-internal requests that aren't application traffic (React Router's route-discovery/"fog of war" manifest request) are recognized and categorized separately, not shown as unexplained API calls — see `../../06-engineering-specs/sdk/instrumentation.md` §Verified wire protocol details.

## US-08.02 — Detect Failed Requests
**Priority:** P0

**As a** software engineer, **I want** failed API/network requests identified, **so that** backend/frontend integration failures are visible.

**Acceptance criteria:** relevant HTTP failures can be identified · network failures and timeouts can be identified where observable · failures can be associated with sessions and issues.

## US-08.03 — Investigate API Performance
**Priority:** P0

**As a** software engineer, **I want** API latency aggregated, **so that** I can identify slow dependencies.

**Acceptance criteria:** request duration is measured · performance can be aggregated by endpoint or normalized resource identity · engineers can filter by time and environment.

## US-08.04 — Understand the Server-to-Server Boundary
**Priority:** P0

**As a** software engineer, **I want** it to be clear when a slow or failed request is a call to my own server function versus something FrontWatch cannot see beyond that point, **so that** I don't mistake "no further detail available" for "nothing else happened."

**Acceptance criteria:** a request to a server function/loader endpoint is captured and labeled like any other network call, including its full duration · the investigation view does not imply visibility into what that server-side code called out to internally (a separate backend API, database, etc.) · **duration for streamed/framed responses (TanStack's `application/x-tss-framed`, React Router's turbo-stream) is presented as "time to response headers," with a visible caveat that a streamed response may still have been receiving data afterward** — not silently presented as total resolution time · this boundary is documented for customers, not left to be discovered by confusion during an incident — see `../../06-engineering-specs/sdk/instrumentation.md` §The observability boundary inside a server function and §Verified wire protocol details.
