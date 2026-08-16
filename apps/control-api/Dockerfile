# Build context must be the REPO ROOT, not this directory — this
# service depends on @frontwatch/contracts via bun workspaces
# ("workspace:*"), which only resolves if the whole workspace is
# present at build time:
#
#   docker build -f apps/control-api/Dockerfile -t frontwatch-control-api .
#
# infrastructure.md's containerization spec: minimal base image, only
# required files, deterministic build (--frozen-lockfile), health
# endpoints exposed (ADR-026's /health/live, /health/ready), immutable
# version tags applied at build/push time (never :latest — a tag
# decision, not something this Dockerfile itself enforces).
#
# `runtime` is deliberately the LAST stage in this file, not `migrate`
# — Docker's default build target (no `--target` flag) is whichever
# stage is physically last, and the deployable app image has to be
# that default, not something every caller has to remember to ask for
# explicitly. Found the hard way: an earlier version of this file put
# `migrate` last, and both `docker build` (no --target) *and* this
# file's own `docker compose` service (which also doesn't set
# `target:`, expecting the implicit default) silently built the
# migration image instead of the app — control-api's container exited
# immediately after running `drizzle-kit migrate` a second time
# instead of starting the server.
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Dependency layer, cached separately from source so an app-code-only
# change doesn't force a full reinstall — only the package.json files
# (and the lockfile, which bun install --frozen-lockfile refuses to
# deviate from) are copied at this stage.
# bun's lockfile is workspace-wide — every workspace member's
# package.json has to be present for --frozen-lockfile to agree the
# lockfile still matches, not just the ones this service actually
# depends on (confirmed the hard way: copying only
# apps/control-api + packages/contracts's package.json files produced
# "lockfile had changes, but lockfile is frozen").
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/control-api/package.json apps/control-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
# --ignore-scripts: the root "prepare" script installs git hooks
# (husky) — meaningless in a build context with no .git directory, and
# --production (which correctly skips husky as a devDependency) leaves
# the "prepare" lifecycle script trying to invoke a binary that's no
# longer installed, failing the whole build otherwise.
RUN bun install --frozen-lockfile --production --ignore-scripts

# migrate: a separate target from `runtime` below, not the same image
# with a different CMD — drizzle-kit is a devDependency (deliberately
# excluded from the lean `runtime` image via --production), so it
# needs its own non-production install. Used as a one-shot init step
# in the self-hosted docker-compose profile (infra/self-hosted/),
# never long-running — must be requested explicitly via
# `--target migrate` / `target: migrate` since it isn't the default.
FROM base AS migrate-deps
COPY package.json bun.lock ./
COPY apps/control-api/package.json apps/control-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
RUN bun install --frozen-lockfile --ignore-scripts

FROM base AS migrate
COPY --from=migrate-deps /app/node_modules node_modules
COPY --from=migrate-deps /app/apps/control-api/node_modules apps/control-api/node_modules
COPY packages/contracts packages/contracts
COPY apps/control-api/drizzle.config.ts apps/control-api/drizzle.config.ts
COPY apps/control-api/drizzle apps/control-api/drizzle
COPY apps/control-api/src/db/schema.ts apps/control-api/src/db/schema.ts
WORKDIR /app/apps/control-api
CMD ["bunx", "drizzle-kit", "migrate"]

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY packages/contracts packages/contracts
COPY apps/control-api apps/control-api

# Non-root, per infrastructure.md's containerization spec — the bun
# base image already ships a "bun" user/group for exactly this.
USER bun
WORKDIR /app/apps/control-api
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
