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

**Done:** 2026-08-12

---

## Step 1.5 — Engineering standards & tooling *(decided 2026-08-12, before Step 2 code starts)*

- [x] Router for `apps/control-api`: **Elysia** — [ADR-018](docs/decisions/ADR-018-elysia-control-plane-router.md)
- [x] TS/Bun lint + format: **Biome**, replacing ESLint+Prettier — [ADR-019](docs/decisions/ADR-019-biome-ts-tooling.md)
- [x] Go lint: `golangci-lint` (unchanged, decided independently)
- [x] Auth library decision **deferred to Step 9** — do not pull in better-auth or wire up Keycloak/OIDC during Step 2; `tech-stack.md` already names OIDC/Keycloak as the documented direction, revisit deliberately (possible ADR) if that changes
- [ ] Actually install/configure Biome + golangci-lint in the repo (still to do)

---

## Step 2 — Control plane *(minimal — project identity only, no auth/RBAC yet)*

- [ ] `projects` table (Postgres) — FKs to `application_id`/`environment_id` left **nullable for now** (real model in `data-model.md` §1 requires them; full `Application`/`Environment` tables deferred, tracked shortcut not silent scope creep)
- [ ] A way to create a project and read back its ID (migration + seed, or a first minimal Elysia endpoint)
- [ ] Tests written alongside this code, not deferred — per `docs/07-delivery/test-strategy.md`'s pyramid (unit first)

**Why here:** the SDK's `init()` and every telemetry event need a real `project_id`, not a placeholder — see the reasoning captured in conversation on 2026-08-12.

---

## Step 3 — SDK skeleton

- [ ] `init()` — config validation, client creation
- [ ] Context (release, environment, route, session, browser, device)
- [ ] Event envelope creation
- [ ] Buffer (bounded, FIFO)
- [ ] Transport skeleton (batching shape — doesn't need to send anywhere real yet)
- [ ] Privacy stub (even a no-op pass-through, to keep the pipeline order correct later)

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
