# Routing Architecture

## Major Routes

```text
/
├── login
└── app
    ├── dashboard
    ├── issues
    │   └── :issueId
    ├── sessions
    │   └── :sessionId
    ├── performance
    ├── network
    ├── releases
    ├── alerts
    └── settings
```

## Investigation URLs

Important investigation state should be represented in the URL.

Example:

```text
/issues/issue_123
  ?environment=production
  &range=24h
  &release=rel_456
```

## Benefits

- shareable investigation
- browser navigation
- incident collaboration
- reproducible context
- bookmarking

## Route Loading

Load only data required for the route.

## Authorization

Routes should not rely only on UI hiding.

The backend remains authoritative.

## Not Found

Provide meaningful resource-not-found states.

## Deep Links

An engineer should be able to paste:

```text
Issue → occurrence → session
```

and another engineer should arrive at the same investigation context.
