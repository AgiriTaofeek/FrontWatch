# Frontend Application Architecture

## Recommended Structure

```text
src/
├── app/
│   ├── providers/
│   ├── routing/
│   ├── auth/
│   └── config/
├── routes/
├── features/
│   ├── health/
│   ├── issues/
│   ├── sessions/
│   ├── performance/
│   ├── network/
│   ├── releases/
│   ├── alerts/
│   └── settings/
├── components/
│   ├── ui/
│   ├── charts/
│   ├── tables/
│   └── timelines/
├── data/
├── hooks/
├── lib/
└── types/
```

## Feature Ownership

Each feature should own:

- API queries
- mutations
- feature-specific components
- feature-specific state
- domain transformations

## Shared Components

Only truly reusable primitives belong in:

```text
components/ui
```

Examples:

```text
Button
Dialog
Tabs
Dropdown
Tooltip
Table
Badge
```

Business-specific components remain inside their feature.

## Avoid

```text
components/
  Everything.tsx
```

The architecture should preserve domain boundaries.
