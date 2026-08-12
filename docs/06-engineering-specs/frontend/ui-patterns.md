# Frontend — UI Patterns

**Status:** Draft · Consolidates: legacy `14-frontend-implementation/data-tables.md`, `charts.md`, `realtime.md`, `loading-errors-empty.md`, `design-system.md`

## 1. Data tables

Support sorting, filtering, pagination, column visibility, keyboard navigation, responsive behavior, loading/empty/error states. **Prefer server-side filtering and pagination** — never fetch thousands of rows just to filter them client-side. Use virtualization for very large lists. Allow row drill-down without losing list context. Important table filters live in URL state where sharing matters (see `application-architecture.md` §3).

## 2. Charts

Every chart answers a specific operational question ("is error rate increasing?", "did deployment change performance?", "which route is affected?") — not decoration. Use time-series aggregation appropriate to the selected range; **never render every raw event for long periods** — downsample raw events into time buckets first. Charts must distinguish zero / no-data / loading / partial-data / query-error as different states (same discipline as `../../04-ux-ui/principles.md` principle 10). Accessible: text summaries, accessible labels, keyboard-accessible controls, non-color-only indicators. Support clear release-A-vs-release-B and current-vs-baseline comparison.

## 3. Real-time updates

MVP uses bounded polling for health, active alerts, recent issue counts. SSE/WebSocket is a later enhancement where live investigation materially improves UX — not an MVP requirement (see `../../02-product/mvp.md`). Potential live event types: `issue.created, issue.regressed, alert.triggered, alert.recovered, deployment.created`. **UI behavior rule: never silently reorder a user's investigation context** — if an issue list gets a new issue mid-investigation, show "new issues available" rather than force-moving the user's selected row. Live updates are an enhancement, not a source of truth — on connection failure, fall back to polling/manual refresh without breaking the page.

## 4. Loading, error & empty states

Use contextual loading indicators — never replace the whole application with a spinner for a small data refresh. Use skeletons where layout stability matters. **Differentiate explicitly:** "No issues" vs. "No data for selected time range" vs. "Telemetry unavailable" are three different messages, not one generic empty state (same principle as `../../04-ux-ui/principles.md` principle 10 and `05-architecture/system-architecture.md` §11's partial-data distinction). Errors are actionable: "Unable to load issue data. Try again. Request ID: ..." — not a bare failure message. If one widget fails while others succeed, don't destroy the entire dashboard. Communicate when displayed data may be stale.

## 5. Design system

Goal: a consistent, engineering-focused interface. Foundations to define: typography, spacing, radius, elevation, icons, colors, motion, density. Semantic status concepts — success, warning, danger, info, neutral, unknown — communicated through more than color alone. Initial component primitives: Button, Input, Select, Tabs, Dialog, Popover, Tooltip, Badge, Alert, Table, Card, Dropdown, Command Menu, Date Range Picker. Data-specific components: Metric Card, Trend Chart, Issue List, Timeline, Event Detail, Status Indicator. Since the product is used by engineers *during investigations*, support a compact, information-dense mode without becoming visually chaotic — see requirements in `../../04-ux-ui/design-system.md`.
