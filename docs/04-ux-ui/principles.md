# FrontWatch — UX Principles

**Status:** Draft · Consolidates: `06-ux-ui/README.md` + `ux-principles.md`

## UX goal

Minimize the time between *"something is wrong"* and *"we understand what happened, what changed, who was affected, and what to fix."* The product is **investigation-first, not dashboard-first** — dashboards are entry points into investigation, not the destination.

## Primary investigation loop

Problem detected → scope impact → determine when it started → identify affected users/routes/environments → correlate with release/deployment → inspect session timeline → inspect network/API activity → inspect performance evidence → form root-cause hypothesis → fix → verify recovery.

## Primary users

Software engineers, DevOps engineers, CTOs — see `01-project/strategy.md` §3 for how their needs differ.

## The ten principles

1. **Investigation first** — every surface should be a step toward understanding, not just a display of data.
2. **Context must follow the engineer.** Moving `Issue → Session → Network → Release` should never require reconstructing application, environment, time range, release, issue, or session from scratch.
3. **Every number needs context.** "Error rate: 4.2%" is insufficient on its own — the UI must make *compared with what, over what period, which environment, which routes, which release* answerable.
4. **Correlation must be explicit, never presented as certainty.** Distinguish *observed* ("error rate increased 3 minutes after deployment") from *possible correlation* ("the increase began shortly after release 4.8.2") from *confirmed* (only when evidence establishes causality).
5. **Progressive disclosure over time reachable, not upfront overload.** Show the most important information first, then let engineers go deeper — see the four-layer model below.
6. **Evidence over guesses** — correlations should be visually distinguishable from confirmed facts.
7. **No dead ends** — every major object should surface useful next actions (e.g. an Issue links to its sessions, release, affected routes, network failures, and related issues).
8. **Production safety is visible** — privacy and sensitive-data protections must be visible and trustworthy, not hidden in a settings page.
9. **Framework agnostic** — the UX stays consistent regardless of React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart, Remix, React Router, or TanStack Start underneath.
10. **Trustworthy missing data.** Never imply "no problems" when the real state is "no telemetry received" — these are fundamentally different states and conflating them is a trust failure (see `01-project/strategy.md` §5, Principle 6 in `01-project/charter.md`).

## Progressive disclosure — the four layers

| Layer | Shows |
|---|---|
| 1 | What happened? How severe? Who is affected? |
| 2 | When? Where? Which release? Which browser? Which route? |
| 3 | Stack trace, breadcrumbs, network requests, performance events, session timeline |
| 4 | Raw event, technical metadata, diagnostic information |

## UX hierarchy

```
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

## Core product surfaces

Application Health · Issue Explorer · Issue Investigation · Session Investigation · Performance Explorer · Network Explorer · Release Health · Alerts · Search · Application Settings · Organization Settings · Self-Hosted Administration.

## Required UI states

Every important surface must account for: loading, empty, healthy, degraded, error, partial data, no permission, no telemetry, stale telemetry, offline/reconnecting where applicable.

## Design test

The UI should always answer *"what should I do next?"* — not merely *"here is some data."*
