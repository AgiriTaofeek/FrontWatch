# Frontend State Management

Separate:

```text
Server state
→ API/query cache

UI state
→ filters, dialogs, selections, layout

URL state
→ time range, filters, issue ID where useful
```

Do not duplicate server state unnecessarily in global client state.

Investigation filters that should be shareable/bookmarkable should live in the URL where appropriate.
