# Frontend — Application Architecture

**Status:** Draft · Consolidates: legacy `14-frontend-implementation/README.md`, `application-architecture.md`, `routing.md`, `server-state.md`, `ui-state.md`. Tech choice → `../../decisions/ADR-014-react-typescript-dashboard.md`.

Goals the dashboard must satisfy: make application health immediately understandable · support fast incident investigation · handle large telemetry datasets · preserve investigation context in URLs · stay responsive during high-volume incidents · accessible and predictable workflows · work for engineers, DevOps, and CTOs alike (`../../01-project/strategy.md` §3).

**Architecture principle:** `Route → Feature → Server data → Domain model → UI`. Avoid building the application as one giant collection of generic components.

## Structure

```
src/
├── app/          providers, routing, auth, config
├── routes/
├── features/     health, issues, sessions, performance, network, releases, alerts, settings
├── components/   ui (Button, Dialog, Tabs, Dropdown, Tooltip, Table, Badge...), charts, tables, timelines
├── data/ · hooks/ · lib/ · types/
```

Each **feature** owns its own API queries, mutations, feature-specific components/state, and domain transformations. Only truly reusable primitives belong in `components/ui`; business-specific components stay inside their feature. Avoid a `components/Everything.tsx` catch-all — the folder structure should preserve domain boundaries, not erode them.

## Routing

```
/
├── login
└── app
    ├── dashboard
    ├── issues/:issueId
    ├── sessions/:sessionId
    ├── performance · network · releases · alerts · settings
```

**Important investigation state lives in the URL**, e.g. `/issues/issue_123?environment=production&range=24h&release=rel_456` — this makes investigations shareable, browser-navigable, collaborative during incidents, reproducible, and bookmarkable. Load only the data a route actually needs. **Routes never rely on UI-hiding for authorization — the backend stays authoritative** (client-side route guards are UX, not security; see `../../05-architecture/security-architecture.md`). Provide meaningful not-found states. An engineer pasting an `Issue → occurrence → session` link should land another engineer in the exact same investigation context.

## Server state, UI state, URL state — kept strictly separate

| State type | Owns | Examples |
|---|---|---|
| **Server state** | API/query layer | issues, events, health, releases |
| **URL state** | Shareable investigation parameters | time range, environment, release, route, browser, status |
| **Local UI state** | Temporary interaction | modal open, expanded panel, selected row, active tab |

**Never dump everything into one global store.** For every piece of state, ask: does the server own it? should it be shareable? is it only local UI state? — then place it accordingly.

**Server state / data fetching specifics:** use a dedicated query layer, not ad hoc copies of API data into global state. Query keys include every relevant filter, e.g. `["issues", applicationId, environment, range, filters]`. Cache short-lived — telemetry is not assumed immutable. Invalidate deliberately (new issue → invalidate issue list; alert resolved → invalidate alert state). Bounded, configurable polling for health/active-alerts/recent-issue-counts in the MVP; SSE/WebSocket live updates are a later enhancement, not a requirement (see `ui-patterns.md` §3).
