# FrontWatch — Information Architecture & Navigation

**Status:** Draft · Consolidates: `06-ux-ui/information-architecture.md` + `navigation.md`

## Top-level structure

```
FrontWatch
├── Overview
├── Applications
│   └── Application
│       ├── Health
│       ├── Issues
│       ├── Performance
│       ├── Network
│       ├── Sessions
│       ├── Releases
│       └── Alerts
├── Explore
│   ├── Issues
│   ├── Events
│   └── Search
├── Settings
│   ├── Application
│   ├── SDK
│   ├── Privacy
│   ├── Alerts
│   └── Releases
└── Organization
    ├── Members
    ├── Roles
    └── Settings
```

## Persistent application context

The selected application, environment, and time range should stay visible and persistent throughout an investigation (e.g. `Customer Banking Portal · Production · Last 24 hours`), without consuming excessive screen space.

## Core entities & relationship

`Organization → Application → Environment → Release → Events → {Issues, Sessions, Network, Performance}`. Full entity attributes live in `03-business-analysis/domain-glossary.md`.

## Primary navigation

`Overview · Applications · Explore · Alerts · Settings` — prioritize operational workflows over a generic menu.

## Application-level navigation

Once an application is selected: `Health · Issues · Performance · Network · Sessions · Releases · Alerts · Settings`.

## Investigation navigation

Investigation pages support contextual, non-destructive navigation, e.g. `Issue → Affected Session → Network Request → Release`. The user must be able to move backward without losing investigation context (selected time range, filters, application/environment).

## Global search

Available from anywhere. Targets: Issue ID, error message, release, route, session ID, user identifier (where permitted), request.
