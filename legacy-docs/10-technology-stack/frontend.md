# Frontend Technology

## Decision

Use **TypeScript + React** for the FrontWatch dashboard.

## Why

The dashboard is a highly interactive technical application requiring:

- charts
- large tables
- timelines
- filters
- keyboard interaction
- deep links
- complex investigation state
- progressive data loading

React has a mature ecosystem for this class of application.

## Rendering Strategy

Use a modern React application with server-side data loading where useful and client-side interaction for investigation-heavy surfaces.

The exact React framework/router should remain a separate implementation decision.

## Frontend Architecture

```text
src/
├── app
├── routes
├── features
│   ├── health
│   ├── issues
│   ├── sessions
│   ├── performance
│   ├── network
│   ├── releases
│   └── alerts
├── components
├── charts
├── data
├── state
├── auth
└── lib
```

## State

Separate:

```text
Server state
UI state
URL state
```

Investigation filters that need to be shareable should be represented in URL state.

## Performance

Large telemetry lists should use:

- cursor pagination
- incremental loading
- virtualization where required
- aggregated queries for charts

Do not download huge event datasets into the browser.

## Design Requirement

The dashboard must remain usable during incidents when data volume and user activity are high.
