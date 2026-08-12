# FrontWatch — Component Architecture

## Components

```text
apps/
├── web
├── api
├── ingestion
└── workers

packages/
├── sdk-core
├── sdk-react
├── sdk-next
├── sdk-vue
├── sdk-svelte
├── sdk-solid
├── event-schema
├── domain
├── privacy
├── config
└── observability
```

This is a conceptual structure, not a final repository layout.

## SDK Core

Framework-independent capabilities:

```text
event creation
context management
sampling
redaction
buffering
transport
error capture
session management
```

## Framework Adapters

Framework packages should remain thin.

```text
sdk-core
   ↑
   ├── React adapter
   ├── Next.js adapter
   ├── Vue adapter
   ├── Nuxt adapter
   ├── Svelte adapter
   ├── SvelteKit adapter
   ├── Solid adapter
   ├── SolidStart adapter
   ├── Remix adapter
   ├── React Router adapter
   └── TanStack Start adapter
```

## Backend Modules

The initial backend should have explicit modules:

```text
identity
organizations
applications
environments
projects
releases
telemetry
issues
sessions
performance
network
alerts
privacy
search
health
```

These can live in one deployable backend initially while retaining clean boundaries.

## Worker Modules

```text
event-normalizer
event-enricher
error-fingerprinter
issue-processor
metric-aggregator
retention-worker
```

These can begin in one worker process and split later if load requires it.
