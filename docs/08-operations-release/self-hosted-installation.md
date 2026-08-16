# Self-hosted installation (Profile B — Small self-hosted, Single VM)

**Status:** Real, dry-run-verified (Step 10, PROGRESS.md) — this is not aspirational documentation; every step below was executed against a real, fresh, from-scratch install as part of closing `docs/02-product/roadmap.md` §3's pilot readiness checklist.

This walks through `infra/self-hosted/docker-compose.yml` — one Docker Compose stack containing both FrontWatch's own services (control-api, ingestion, worker, web) and its infrastructure dependencies (Postgres, ClickHouse, Redpanda), matching `infrastructure.md`'s deployment profile table's **Profile B: "Single VM or small Kubernetes deployment, for pilots/smaller teams."** This is the single-VM variant. `infra/local/docker-compose.yml` is a different, narrower thing — dev-infra-only, meant to run alongside `go run`/`bun --watch` on a developer's own machine, not a deployable product.

## Prerequisites

- Docker and Docker Compose
- Ports 3000 (control-api), 3001 (web), 8080 (ingestion), and 19092 (Redpanda, optional — only needed if something outside this stack needs to reach it) free on the host. Postgres and ClickHouse are deliberately **not** exposed to the host — `infrastructure.md`: *"only Web/API and Ingestion are normally exposed."*

## 1. Configure

```sh
cp infra/self-hosted/.env.example infra/self-hosted/.env
```

Edit `infra/self-hosted/.env`:
- `POSTGRES_PASSWORD` / `CLICKHOUSE_PASSWORD` — real secrets for anything beyond a local trial.
- `WEB_ORIGIN` — the dashboard's real origin as a browser will load it (used for control-api's CORS allowlist).
- `VITE_API_BASE_URL` — control-api's real, browser-reachable address. **This is baked into the dashboard's build at build time**, not read at container runtime (Vite's `VITE_`-prefixed env vars only ever exist client-side as build-time replacements) — get this right before building, not after.

## 2. Build and start

```sh
docker compose -f infra/self-hosted/docker-compose.yml --env-file infra/self-hosted/.env build
docker compose -f infra/self-hosted/docker-compose.yml --env-file infra/self-hosted/.env up -d
```

Two one-shot init services (`postgres-migrate`, `clickhouse-migrate`) apply schema migrations against the freshly created, empty databases before `control-api`/`ingestion`/`worker` start — nothing here requires a manual migration step.

**Validate:**

```sh
curl http://localhost:3000/health/ready   # control-api — {"checks":{"postgres":{"status":"up"},"clickhouse":{"status":"up"}}}
curl http://localhost:8080/health/ready   # ingestion — {"checks":{"postgres":{"status":"up"},"redpanda":{"status":"up"}}}
curl -I http://localhost:3001/            # web — 200
```

## 3. Create your organization and first admin

Open `http://localhost:3001/register` (or `POST /api/v1/auth/register` directly) and create your organization. The creating user becomes an Administrator (US-01.01). This sets a session cookie — the dashboard's login/register screens are real, not placeholders (Step 10 built these; they didn't exist before this pass — `apps/web/src/routes/login.tsx`/`register.tsx`).

## 4. Create a project and install the SDK

From the dashboard's landing page (or `POST /api/v1/projects`), create a project — this returns a `publicKey`, which is what the SDK's `init()` needs.

```ts
import { init } from "@frontwatch/sdk";

init({
	publicKey: "fw_pk_...",          // from the project you just created
	endpoint: "http://localhost:8080", // your ingestion service's address
	environment: "production",
	release: "1.0.0",
});
```

**Known limitation:** `packages/sdk` has no published npm package yet (`packages/sdk/package.json`'s `main`/`types` point directly at TypeScript source) — a pilot customer's app has to consume it from a local path or a private registry your own build process publishes to, not `npm install @frontwatch/sdk`. Tracked as a real gap, not hidden (see PROGRESS.md's Step 10 entry).

## 5. Source maps

**Not built.** `docs/06-engineering-specs/sdk/privacy-and-security.md` specifies a source-map upload/resolution flow, but no upload endpoint, storage, or server-side resolution exists anywhere in this codebase today — confirmed by exhaustive search as part of Step 10's readiness dry-run. Production error stack traces will show minified locations only. This is a real, scoped-out gap (needs an object-storage decision this project hasn't made — `docs/decisions/README.md`'s own "genuinely still open" list), not a step this guide can walk you through yet.

## 6. Privacy rules

**Not built.** `packages/sdk/src/privacy.ts`'s `applyPrivacy()` is a structural no-op (ADR-007's pipeline stage exists so ordering is right later, per its own comment) — there is no redaction of URLs, headers, or form input today, and no config surface (client or server-side) to configure any. Confirmed the SDK's `InitOptions` has no `privacy` field. Treat all captured telemetry as unredacted until this is built — a real gap for any pilot handling sensitive data in URLs/headers/inputs.

## 7. Configure an alert

From the dashboard's project alert-rules page (`/projects/:projectId/alert-rules`) or directly:

```sh
curl -X POST http://localhost:3000/api/v1/projects/<projectId>/alert-rules \
  -H "Content-Type: application/json" \
  -H "Cookie: fw_session=<your session cookie>" \
  -d '{"type":"new_issue","webhookUrl":"https://your-webhook-receiver.example.com"}'
```

The alert-evaluator (`bun run alert-evaluator` inside the control-api image, or its own container in a larger deployment) polls and delivers webhooks — real and working (Step 8), not part of what this pass had to build.

## 8. Configure backups

Postgres is the control-plane's only backed-up store today (`docs/08-operations-release/runbooks/postgres-backup-restore.md`'s explicit scope — ClickHouse telemetry backup remains a deliberately deferred, separate policy decision). Because this profile doesn't expose Postgres to the host, run `pg_dump` **inside** the container instead of using `scripts/backup-postgres.sh` directly (which assumes a host-reachable `DATABASE_URL` and needs a version-matched local `pg_dump` — neither applies here, and running it in-container sidesteps both):

```sh
docker compose -f infra/self-hosted/docker-compose.yml exec -T postgres \
  pg_dump -U frontwatch -Fc frontwatch > frontwatch-backup.dump
```

Restoring follows the same runbook's "real recovery" procedure, adapted the same way (`docker compose exec -T postgres pg_restore ...` instead of a host-side `pg_restore`). `scripts/dr-exercise.sh` (Step 9) validates the underlying backup/restore mechanics for the `infra/local/` profile specifically; running that same exercise against this profile is real, valuable future work, not yet done (see PROGRESS.md's Step 10 entry).

## Known limitations of this profile

- **No TLS/reverse-proxy story.** `control-api`'s session cookie is marked `Secure` whenever `NODE_ENV=production` (which this Dockerfile always sets — a real production image should never silently downgrade this), and a `Secure` cookie is only sent by a browser back over an HTTPS connection. This compose profile terminates plain HTTP end to end, with nothing in front of it doing TLS termination (`infrastructure.md`'s own deployment-flow diagram implies a `Load Balancer → Ingress` layer exists in front of a real deployment — this profile doesn't build one). Whether `http://localhost` specifically gets special browser-side leniency for `Secure` cookies varies by browser/version and wasn't verified here (this dry-run used `curl`, which doesn't enforce the `Secure` attribute the way a real browser does) — **do not assume login works in a real browser against a non-`localhost` host without adding a TLS-terminating reverse proxy first.** Found during Step 10's own dry-run, not assumed away.
- `VITE_API_BASE_URL` is a build-time value — moving the dashboard to a new address means rebuilding its image, not just changing an env var. A future multi-tenant/runtime-configurable profile would need a small runtime-config-injection mechanism instead.
- No object storage, no source maps, no privacy/redaction (see §5/§6 above).
- No Kubernetes/Helm packaging — this profile is Docker Compose only, matching Profile B's "Single VM" variant, not its "small Kubernetes deployment" alternative.
- No automated backup cadence — `docker compose exec ... pg_dump` above is a manual procedure, same status `scripts/backup-postgres.sh` already had for the `infra/local/` profile.
- `apps/web`'s Docker image is large (~700MB) — both the root and per-workspace `node_modules` trees have to be copied into the runtime image (found the hard way: the TanStack Start production server bundle isn't fully self-contained, it still resolves `react` and other dependencies from `node_modules` at runtime, not just at build time). A further optimization (pruning to only what `dist/server/server.js` actually requires, or a Nitro preset that bundles more aggressively) is real, unstarted follow-up work.
