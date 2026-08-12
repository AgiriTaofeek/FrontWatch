# FrontWatch — Design System Requirements

**Status:** Draft · Source: `06-ux-ui/design-system-requirements.md`. This defines requirements the design system must satisfy; the actual component library/tokens are built later and specified in `06-engineering-specs/frontend/`.

## Goal

Support a dense technical product without becoming visually overwhelming.

## Required components

| Category | Components |
|---|---|
| **Navigation** | Sidebar, breadcrumbs, tabs, application/environment switcher |
| **Data** | Metric cards, tables, charts, timeline, event list, status indicators, filters, search, pagination/infinite loading |
| **Investigation** | Issue header, stack trace viewer, event details, breadcrumb timeline, session timeline, network request panel, release comparison, correlation indicators |
| **Feedback** | Loading, empty, error, warning, success, partial-data, and stale-data states |

## Technical UX requirements

Keyboard navigation · accessible focus states · responsive layouts · dense desktop workflows · large-dataset handling · virtualized lists where required · copy-to-clipboard for technical identifiers · deep links into investigations.

## Status language

Use explicit, unambiguous states: **Healthy, Degraded, Critical, No data, Stale, Unknown.** Avoid vague language like "Good / Okay / Bad" — vague status language is exactly what causes the "no telemetry" vs. "healthy" conflation `principles.md` warns against.
