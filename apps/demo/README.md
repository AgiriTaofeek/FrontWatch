# @frontwatch/demo

A real, clickable browser page instrumented with `@frontwatch/sdk` — not a
product surface. It exists so you can exercise the SDK's real automatic
instrumentation (error capture, network capture, `web-vitals` performance
capture) end to end without needing an actual pilot customer's app yet.

## Use it

1. Have the self-hosted stack running (`infra/self-hosted/docker-compose.yml`),
   and a project created via the dashboard (or `POST /api/v1/projects`) —
   you need its `publicKey`.
2. `bun install` at the repo root (once), then from this directory:
   ```sh
   bun run dev
   ```
3. Open the printed local URL, paste in your project's public key, leave
   the endpoint as `http://localhost:8080` (ingestion), click
   **Initialize SDK**.
4. Click the buttons — each one triggers a real browser event the SDK's
   instrumentation actually captures (an uncaught `SyntaxError`, a
   manually-caught handled error, a successful/failing/slow `fetch`).
   Performance metrics report on their own from real page interaction.
5. Check the dashboard's issues/network/performance pages for the project
   you configured — the telemetry you just generated should show up
   within a few seconds.

## Why this exists

`packages/sdk` has no published/bundled npm artifact yet
(`docs/08-operations-release/self-hosted-installation.md`'s own documented
gap) — Vite resolving `@frontwatch/sdk` straight from its TypeScript source
via the workspace is exactly the "consume from a local path" story that
guide already describes, made concrete and clickable here.
