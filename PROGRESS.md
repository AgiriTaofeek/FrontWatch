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

- [ ] Auth against project key
- [ ] Validate incoming payload against the versioned event contract
- [ ] Publish to Redpanda

---

## Step 5 — Processing

- [ ] Consume from Redpanda
- [ ] Normalize
- [ ] Fingerprint
- [ ] Write to ClickHouse

---

## Step 6 — Error investigation *(closes the MVP build-gate slice)*

- [ ] Issue grouping
- [ ] Issue API (Bun control plane)
- [ ] Dashboard issue list
- [ ] Dashboard issue detail

**Milestone:** once this works end to end, `mvp.md` §3's golden scenario is real — an actual error, captured, grouped, and visible in a dashboard.

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

*(Empty so far — record here whenever the actual build order or scope diverges from the plan above, with a one-line reason.)*
