# FrontWatch — Build Progress

A personal build-tracking checklist, kept separate from `docs/`. The *plan* lives in [`docs/02-product/roadmap.md`](docs/02-product/roadmap.md) §2 and [`docs/07-delivery/execution-roadmap.md`](docs/07-delivery/execution-roadmap.md) — this file tracks actual status against that plan, plus notes on anything that changed along the way. **Order isn't fixed** — if a step gets reordered or reshaped, note it in the deviations log below rather than silently rewriting history.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Step 1 — Repository & local platform ✅

- [x] Monorepo skeleton (`apps/`, `packages/`, `services/data-plane/`) per `docs/06-engineering-specs/README.md`
- [x] Bun workspace root (`package.json` + `workspaces`), one placeholder `package.json` per package
- [x] Go module for `services/data-plane`, four `cmd/*` binary stubs (`ingestion`, `worker`, `alert-worker`, `retention-worker`), `go build ./...` compiles clean
- [x] `.gitignore` covers Go build artifacts (`bin/`, `*.test`, `*.out`)
- [x] Local infra verified healthy (`infra/local/docker-compose.yml` — Postgres, ClickHouse, Redpanda)
- [x] Initial commits pushed to `github.com/AgiriTaofeek/FrontWatch`, default branch `main`
- [x] CI (`.github/workflows/ci.yml`): Biome check + Go build/lint on push and PR
- [x] Branch protection on `main`: PR required (0 reviewers, solo project), CI must pass, no force-push/delete, applies to admins too

**Done:** 2026-08-12 — this fully closes M0's "CI" exit criterion, which had been marked done prematurely in the previous entry.

**Workflow from here on:** branch → PR → CI green → self-merge. Direct pushes to `main` are no longer possible (protection is enforced, including for the repo owner).

---

## Step 1.5 — Engineering standards & tooling *(decided 2026-08-12, before Step 2 code starts)*

- [x] Router for `apps/control-api`: **Elysia** — [ADR-018](docs/decisions/ADR-018-elysia-control-plane-router.md)
- [x] TS/Bun lint + format: **Biome**, replacing ESLint+Prettier — [ADR-019](docs/decisions/ADR-019-biome-ts-tooling.md)
- [x] Go lint: `golangci-lint` (unchanged, decided independently)
- [x] Auth library decision **deferred to Step 9** — do not pull in better-auth or wire up Keycloak/OIDC during Step 2; `tech-stack.md` already names OIDC/Keycloak as the documented direction, revisit deliberately (possible ADR) if that changes
- [x] Biome + golangci-lint installed and verified working (`biome check .` clean, `golangci-lint run ./...` clean)
- [x] Elysia installed in `apps/control-api`, `@types/bun`, shared `packages/config/tsconfig.base.json`
- [x] CI workflow + branch protection on `main` (recorded under Step 1 above — CI applies repo-wide, not control-plane-specific)
- [x] Husky + commitlint (`commit-msg`, enforcing Conventional Commits) + lint-staged (`pre-commit`: Biome on staged TS/JSON, `go build`+`golangci-lint --new-from-rev` on staged Go)

**Done:** 2026-08-12

---

## Step 2 — Control plane *(minimal — project identity only, no auth/RBAC yet)*

- [x] DB tooling decided: **Drizzle ORM, `bun-sql` driver** — [ADR-020](docs/decisions/ADR-020-drizzle-bun-sql.md)
- [x] UUID primary keys decided — [ADR-021](docs/decisions/ADR-021-uuid-primary-keys.md)
- [x] `drizzle.config.ts` + schema file in `apps/control-api` (`src/db/schema.ts`)
- [x] `projects` table (Postgres) — FKs to `application_id`/`environment_id` left **nullable for now** (real model in `data-model.md` §1 requires them; full `Application`/`Environment` tables deferred, tracked shortcut not silent scope creep)
- [x] First migration generated + applied against local Postgres (`infra/local/docker-compose.yml`), verified via `psql`
- [x] A way to create a project and read back its ID — `POST /projects` + `GET /projects/:id` (`apps/control-api/src/routes/projects.ts`)
- [x] Tests written alongside this code — `projects.test.ts`, integration-layer (real local Postgres), CI runs them against a `postgres:16` service container
- [x] `apps/control-api/src/index.ts` — app entry point mounting the route

**Done:** 2026-08-12 — closes Step 2. No auth/RBAC yet (still correctly deferred to Step 9).

**Why here:** the SDK's `init()` and every telemetry event need a real `project_id`, not a placeholder — see the reasoning captured in conversation on 2026-08-12.

---

## Step 3 — SDK skeleton ✅

- [x] `init()` — config validation (never crashes on bad config, disables itself instead), dedup behavior, client creation (`client.ts`)
- [x] Context (release, environment, route, sessionId, userAgent — minimal, no UA parsing yet) (`context.ts`)
- [x] Event envelope creation — SDK-side shape only, no tenant IDs (those get resolved server-side at ingestion, per data-model.md §10) (`event.ts`)
- [x] Buffer (bounded, FIFO, count-based only — no byte-size bound or shutdown-flush yet) (`buffer.ts`)
- [x] Transport skeleton — batching, bounded exponential backoff, retries only 5xx/network failures not 4xx (`transport.ts`)
- [x] Privacy stub — no-op, but structurally present in the pipeline per ADR-007 (`privacy.ts`)
- [x] First real instrumentation: `errors.ts` — `window.addEventListener('error'/'unhandledrejection')`, thin wrapper over `captureException`
- [x] Tests: 11 passing (buffer, transport retry/backoff with mocked fetch, error-instrumentation with `happy-dom`)

**Done:** 2026-08-13. **Real finding:** a root-level `bun test` does not reliably apply a nested package's `bunfig.toml` (confirmed empirically — `happy-dom` never registered, `window is not defined`) — each package's tests must run scoped to that package, both locally and in CI. Fixed `ci.yml` accordingly (separate `apps/control-api` and `packages/sdk` test steps).

**Deferred, not forgotten:** resource-loading-failure capture, `captureMessage`/`addBreadcrumb`/`setUser`/`flush`/`close`, sampling, real UA parsing, byte-bounded buffer, shutdown flush, framework adapters.

---

## Step 4 — Ingestion

- [x] ADR-022: Go ingestion reads Postgres directly (read-only), resolving code-structure.md's explicitly-flagged open question
- [x] `packages/contracts`: wire types matching `api-contracts.md` §3-4 exactly (`WireEvent`, `IngestRequest`, `IngestResponse`), plus a fixture lifted straight from the doc's own example
- [x] Fixed a real drift: SDK's `transport.ts` was sending an invented shape (camelCase, no batch envelope, made-up `X-Frontwatch-Key` header) that didn't match the documented wire contract at all — now serializes via `packages/sdk/src/serialize.ts` → `@frontwatch/contracts`, standard `Authorization: Bearer <publicKey>`, `POST /ingest/v1/events`
- [x] Contract test: `serialize.test.ts` asserts the serializer's output against the spec-derived fixture directly, not just "it compiles"
- [x] Validate incoming payload against the versioned event contract (Go side) — `internal/telemetry`, pure domain layer, zero infra imports per code-structure.md's strict dependency direction. 7 table-driven tests passing, `golangci-lint` clean
- [x] `internal/platform/config` — typed startup config, exits clearly on missing `DATABASE_URL`/`REDPANDA_BROKERS` rather than starting partially-configured. Real finding: a test passed locally only because my shell had `DATABASE_URL` exported from a prior command — `t.Setenv` doesn't clear vars it wasn't told about — fixed by explicitly clearing it per-subtest instead of relying on ambient absence
- [x] Auth against project key (Go side) — `internal/storage/postgres`, one narrow `ProjectCredentialRepository.FindActiveByPublicKey`, `pgx` v5.10.0, per ADR-022. Disabled and nonexistent keys deliberately return the same error (no signal leaked either way). Integration-tested against real local Postgres (insert/query/cleanup), skips cleanly if `DATABASE_URL` unset
- [x] Real gap caught and fixed: `ci.yml`'s Go job only ever ran `go build` + `golangci-lint` — `go test` never ran in CI, so the Postgres integration test above would have passed locally forever and never actually run where it matters. Added a `postgres:16` service + Bun/drizzle-kit migration step to the Go job too (Go's tests need the real schema Bun owns)
- [x] Publish to Redpanda (`franz-go` v1.21.6) — `internal/queue`, publishes raw decoded events to `telemetry.raw`, keyed by `project_id` (per-project ordering, load spread across partitions). Normalization/fingerprinting stay downstream in the worker, not ingestion's job
- [x] **Real infra bug found and fixed**: `infra/local/docker-compose.yml`'s Redpanda only advertised itself at `redpanda:9092` (Docker-internal hostname) — any client running on the host (not in a container) could complete the initial bootstrap against `localhost:9092` but then hung trying to reach the *advertised* address for the actual produce/consume. Never caught before because the healthcheck runs `rpk` *inside* the container, and nothing had actually tried to produce/consume from the host until this. Fixed with a proper dual-listener config (internal for other containers, external on a distinct port for the host) — confirmed by hitting `context deadline exceeded` before the fix, sub-100ms after
- [x] CI: `services:` can't override a container's startup command (needed for Redpanda's required flags) — tried the official `redpanda-data/github-action`, found it genuinely broken (hardcoded to a Docker Hub image name — `vectorized/redpanda` — that no longer exists), replaced with a direct `docker run` using the same known-working image as local dev
- [x] `internal/telemetry/service.go` — `IngestService` orchestrating `Authenticate → Validate → durably enqueue`, matching `api-contracts.md` §3 exactly, including partial batch acceptance (one malformed event rejects only that event, not the whole batch). 5 tests with fake credential/publisher implementations
- [x] `cmd/ingestion/main.go` wired together for real — HTTP handler (thin, per `services.md`'s rule: parse + map response, no business logic), `Authorization: Bearer` parsing, graceful shutdown (SIGTERM → stop accepting → finish in-flight → close dependencies, bounded 10s timeout, per `operations.md`)
- [x] **Full end-to-end verification, not just unit tests**: real project created in Postgres, real server started, real `curl` requests covering all paths (valid batch, missing auth → 401, wrong key → 401, malformed body → 400, mixed valid/invalid batch → partial acceptance) — then confirmed the accepted events actually landed on Redpanda with correct content via `rpk topic consume`, and that the rejected event correctly never did

**Done:** 2026-08-13 — closes Step 4. The MVP golden scenario's first three hops (SDK → ingestion → Redpanda) are now real and verified end to end, not just individually tested.

**Deferred, not forgotten:** `/health/live`/`/health/ready` endpoints (operations.md names these explicitly — Step 8's job), ingestion metrics (`ingestion_requests_total` etc., also Step 8), rate limiting, privacy checks at the ingestion boundary (instrumentation.md mentions this but it's not built), topic provisioning (currently relies on Redpanda's auto-topic-creation — fine for MVP, not a production answer per ADR-013).

---

## Step 5 — Processing

- [x] **Scope clarified**: issue grouping/counts/the Issue entity itself are Step 6's job, not Step 5's — this step is consume → decode/validate → normalize (pass-through, no framework-specific shapes exist yet to normalize) → fingerprint → write raw events, no mutable state
- [x] `migrations/clickhouse/0001_create_events_table` — `golang-migrate` (v4.19.1) with the ClickHouse driver, same versioned/reviewable role `drizzle-kit` plays for Postgres. `events` table: `ReplacingMergeTree`, partitioned by `toDate(client_timestamp)` (data-model.md §7's literal recommendation), ordered by `(project_id, event_type, client_timestamp, event_id)`
- [x] **Real infra bug #3 found and fixed, same class as Redpanda's**: the official ClickHouse image disables network access entirely for the `default` user unless `CLICKHOUSE_USER`/`CLICKHOUSE_PASSWORD` is set — confirmed directly from its own startup log. ClickHouse had been unreachable from outside its own container this whole time; the `/ping` healthcheck never required auth so never caught it
- [x] `internal/issue/fingerprint.go` — SHA-256 of `exception_type + normalized_message`, truncated to 16 hex chars, versioned (`FingerprintVersion`) per the legacy fingerprinting spec's explicit requirement. Normalization strips numbers/UUIDs/hex/quoted strings — noise-resistance verified both in unit tests and end-to-end (two real events with different order IDs through the whole running pipeline produced the identical fingerprint)
- [x] `internal/storage/clickhouse` — `EventWriter`, `clickhouse-go` v2.48.0 (official client)
- [x] `internal/telemetry/process_service.go` — `ProcessEventService` (Normalize→Fingerprint only; persist is the worker's wiring concern, not this service's)
- [x] `cmd/worker/main.go` wired together — `franz-go` consumer group, manual per-record commit strictly in order (a plain loop, not `EachRecord`'s callback — needed the ability to `break` early on a persist failure, since Kafka's committed offset is a single watermark per partition, not a sparse set; committing a later record would have silently marked an earlier failed one as done too)
- [x] **Full end-to-end verification**: real project created, both ingestion and worker started for real, sent real events through `curl` → ingestion → Redpanda → worker → ClickHouse, confirmed via direct ClickHouse queries. Also verified the explicit "malformed event must never terminate the worker" requirement by publishing genuinely broken JSON straight onto the topic — logged clearly, worker kept running

**Done:** 2026-08-14 — closes Step 5. **Deferred, not forgotten:** bounded-concurrency record processing (currently sequential — simplest-correct, not yet a throughput bottleneck), retry-with-backoff before giving up on a persist failure (currently stops and waits for redelivery/restart), dead-lettering malformed/invalid records (currently logged and skipped), enrichment (browser family/device class — blocked on the same UA-parsing gap noted in Step 3), a second server-side privacy layer (instrumentation.md names this; neither layer is real yet, client or server).

---

## Step 6 — Error investigation *(closes the MVP build-gate slice)*

- [x] ADR-023: issues derived by query (`GROUP BY project_id, fingerprint` over `events`), no separate materialized table — resolves the Step 5 deferral. Resolution state (`E11.03`) explicitly out of scope, not in `PROGRESS.md`'s original Step 6 list or `mvp.md`'s golden scenario
- [x] ADR-024: TanStack Start for `apps/web` — resolves `tech-stack.md`'s open frontend-router question, also doubles as SDK dogfooding (Tier 1 adapter target)
- [x] Issue grouping — `apps/control-api/src/db/issues.ts`, the ADR-023 aggregation queries (`listIssues`, `getIssue`), verified against `@clickhouse/client` v1.23.1 (works fine under Bun)
- [x] Issue API (Bun control plane) — `GET /api/v1/projects/:projectId/issues`, `GET /api/v1/issues/:issueId`. **Deviation from api-contracts.md** (tracked, not silent): documented as `/applications/{id}/issues`, built as project-scoped instead — `Application` isn't a real entity yet (Step 2's nullable-FK shortcut), `project_id` is what `events` is actually keyed by
- [x] **Also fixed while wiring this up**: every control-plane route lacked the `/api/v1` prefix `api-contracts.md` documents (ingestion already had `/ingest/v1/`, this side never got the equivalent) — fixed at composition time in `index.ts`, not per route file, so route-level tests keep testing unprefixed paths directly
- [x] **Real bug caught only by starting the actual composed server**, not by either route file's isolated tests: Elysia's router rejects two different parameter names (`id` vs `projectId`) at the same URL position across merged route trees — `projects.ts`'s `/projects/:id` renamed to `/projects/:projectId` for consistency with `issues.ts`
- [x] **Real format gap caught by testing**: ClickHouse's `DateTime64` via JSONEachRow insert wants its own `YYYY-MM-DD HH:MM:SS.mmm` string format, not ISO-8601 with `T`/`Z` — didn't surface in Step 5 because Go's client uses the binary native protocol, not string parsing
- [x] **Full end-to-end verification through all three services**: real project created, ingestion + worker + control-api all started for real, a `curl` request matching `mvp.md` §3's exact golden scenario (release `4.2.0`, route `/transfer`) sent through ingestion → Redpanda → worker → ClickHouse → confirmed visible via the real issue list and issue detail endpoints
- [x] CI: added ClickHouse to the TS job too (separate runner from the Go job, needs its own migrated instance) — the migration step there needs `golang-migrate` (Go-based) even though it's nominally the "TypeScript" job, since that's the one tool this project uses for ClickHouse schema
- [ ] Dashboard issue list
- [ ] Dashboard issue detail

**Milestone:** the backend half of `mvp.md` §3's golden scenario is now real, verified end to end — error → captured → grouped → queryable. What's left is putting it in front of a human: the dashboard.

---

## Step 7 — Context

- [ ] Session
- [ ] Network
- [ ] Performance
- [ ] Release

---

## Step 8 — Operations

- [ ] Alerts (new issue, error spike, performance degradation, health degradation)
- [ ] Internal observability (FrontWatch monitoring itself)
- [ ] Backup / restore

---

## Step 9 — Hardening

- [ ] Full auth / RBAC (Administrator / Engineer / Viewer)
- [ ] Tenant isolation
- [ ] Load testing
- [ ] Failure recovery
- [ ] Disaster recovery testing

---

## Step 10 — Pilot

- [ ] Real, controlled customer application onboarded
- [ ] Pilot readiness checklist satisfied (`docs/02-product/roadmap.md` §3)

---

## Deviations log

- **2026-08-14, Step 6**: Issue list endpoint built as `GET /api/v1/projects/:projectId/issues` instead of `api-contracts.md`'s documented `GET /api/v1/applications/{id}/issues`. Reason: `Application` isn't a real entity yet (Step 2's deliberate nullable-FK shortcut on `projects`), and `project_id` is what `events` in ClickHouse is actually keyed by. Revisit once `Application` is real (not currently scheduled).
