# FrontWatch — Frontend Architecture

## Goal

Build a fast investigation interface capable of handling dense technical data.

## Architectural Principles

### Route-Oriented

Major product surfaces map naturally to application routes.

```text
/app/:id
/app/:id/issues
/app/:id/issues/:issueId
/app/:id/sessions/:sessionId
/app/:id/performance
/app/:id/network
/app/:id/releases
```

### Server vs Client

Use server-side data loading where it improves:

- initial page performance
- access control
- secure data fetching

Use client-side state for:

- interactive filters
- timelines
- charts
- live updates
- investigation interactions

## State Categories

### Server State

- issues
- sessions
- releases
- telemetry
- health

### UI State

- filters
- selected tabs
- expanded panels
- chart ranges

### URL State

Important investigation context should be shareable through URLs.

Examples:

```text
time range
environment
release
route
issue
```

## Performance

The UI must support:

- large issue lists
- long timelines
- high-volume tables
- virtualized data where necessary
- incremental loading

## Deep Links

Every important investigation state should be linkable.

Example:

```text
Issue → affected session → exact event
```

An engineer should be able to send a link to another engineer and preserve relevant context.
