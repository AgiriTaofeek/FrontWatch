# SDK Navigation Monitoring

## Goal

Understand which routes customers visit and where failures occur.

## SPA

Capture client-side route transitions.

## Full Page Navigation

Capture navigation timing/context on each page.

## Route Identity

Prefer normalized route identities where possible.

Example:

```text
/accounts/123
```

may become:

```text
/accounts/:accountId
```

## Navigation Event

Conceptually:

```json
{
  "event_type": "navigation",
  "from_route": "/home",
  "to_route": "/accounts/:id",
  "navigation_type": "spa"
}
```

## Framework Adapters

Each router integration should translate framework-specific navigation events into the common representation.

## Privacy

Do not blindly capture query strings that may contain sensitive information.

URL normalization and configurable query-parameter filtering are required.
