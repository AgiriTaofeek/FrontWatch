# Build context must be the REPO ROOT — same bun-workspaces reasoning
# as apps/control-api/Dockerfile:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_BASE_URL=http://your-host:3000 \
#     -t frontwatch-web .
#
# VITE_API_BASE_URL is baked into the client bundle at *build* time —
# Vite only exposes VITE_-prefixed vars to browser code at build time,
# never at container runtime (confirmed: apps/web/src/lib/api.ts reads
# it via import.meta.env, which Vite replaces at bundle time, not a
# process.env lookup a running container could override). A real
# single-VM self-hosted install has to know the operator-facing
# control-api URL before building this image — documented as a known
# limitation of this deployment profile, not hidden: a future
# multi-tenant/runtime-configurable profile would need a small
# runtime-config-injection mechanism instead of this ARG.
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/control-api/package.json apps/control-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
# Not --production here — vite and the TanStack Start plugin (both
# devDependencies) are needed to build, not just run, this app.
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY packages/contracts packages/contracts
# tsconfig.json extends packages/config/tsconfig.base.json — found the
# hard way ("Tsconfig not found") that the build needs this package's
# actual files, not just its package.json (already copied above for
# the lockfile-consistency install step).
COPY packages/config packages/config
COPY apps/web apps/web
WORKDIR /app/apps/web
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
# Both node_modules trees — bun workspaces don't fully hoist every
# dependency to the root; found the hard way ("Cannot find package
# 'react'") that apps/web gets its own node_modules (react, vite,
# @tanstack/*) alongside the root's, and the built server.js needs
# both to actually resolve its imports at runtime, not just at build
# time (the "production build" bundles application code, not every
# dependency it imports).
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/web/node_modules apps/web/node_modules
COPY --from=build /app/apps/web/dist /app/apps/web/dist
WORKDIR /app/apps/web
USER bun
ENV PORT=3001
EXPOSE 3001
CMD ["bun", "dist/server/server.js"]
