# FrontWatch — UX/UI Requirements

This directory defines how engineers use FrontWatch to discover, understand, investigate, and resolve frontend production problems.

## UX Goal

FrontWatch should minimize the time between:

> "Something is wrong"

and

> "We understand what happened, what changed, who was affected, and what to fix."

The product is therefore investigation-first rather than dashboard-first.

## Primary Investigation Loop

```text
Problem detected
      ↓
Scope impact
      ↓
Determine when it started
      ↓
Identify affected users/routes/environments
      ↓
Correlate with release/deployment
      ↓
Inspect session timeline
      ↓
Inspect network/API activity
      ↓
Inspect performance evidence
      ↓
Form root-cause hypothesis
      ↓
Fix
      ↓
Verify recovery
```

## Primary Users

- Software engineers
- DevOps engineers
- CTOs

## UX Principles

1. **Time to understanding** — important evidence should be reachable quickly.
2. **Context over isolated events** — every issue should provide surrounding evidence.
3. **Progressive disclosure** — show the most important information first, then allow deeper investigation.
4. **Evidence, not guesses** — correlations should be distinguishable from confirmed facts.
5. **Production safety** — privacy and sensitive data protections must be visible and trustworthy.
6. **Framework agnostic** — the UX should remain consistent regardless of React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart, Remix, React Router, or TanStack Start.
7. **Operational clarity** — an engineer should always know environment, time range, release, and scope.
8. **Low cognitive load** — avoid forcing engineers to reconstruct context manually.
9. **Fast navigation** — investigation should not require repeatedly returning to dashboards.
10. **Trust** — telemetry freshness, missing data, and uncertainty should be communicated clearly.

## UX Hierarchy

```text
Organization
 └── Application
      └── Environment
           ├── Health
           ├── Issues
           ├── Performance
           ├── Network
           ├── Sessions
           ├── Releases
           └── Alerts
```

## Core Product Surfaces

1. Application Health
2. Issue Explorer
3. Issue Investigation
4. Session Investigation
5. Performance Explorer
6. Network Explorer
7. Release Health
8. Alerts
9. Search
10. Application Settings
11. Organization Settings
12. Self-hosted Administration

## UX States

Every important surface must account for:

- Loading
- Empty
- Healthy
- Degraded
- Error
- Partial data
- No permission
- No telemetry
- Stale telemetry
- Offline/reconnecting where applicable

## Design Principle

The UI should answer:

> "What should I do next?"

not merely:

> "Here is some data."
