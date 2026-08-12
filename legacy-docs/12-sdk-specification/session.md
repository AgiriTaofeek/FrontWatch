# SDK Session Tracking

## Goal

Provide enough context to reconstruct a customer's frontend experience.

## Session Lifecycle

```text
session_start
      ↓
events
      ↓
events
      ↓
session_end / timeout
```

A session can also remain open until a timeout/expiration policy determines inactivity.

## Session ID

The SDK generates or obtains a stable opaque session identifier.

It must not directly encode sensitive customer information.

## Session Context

Events can reference:

```text
session_id
```

## Session Sampling

Session capture should be configurable.

## Privacy

Session tracking must not become a mechanism for collecting sensitive customer data.

## Cross-Page Behavior

The implementation must account for:

- SPA navigation
- full page navigation
- reload
- multi-tab behavior
- browser lifecycle

## SSR

Session identifiers must not accidentally be generated in server-side execution contexts.
