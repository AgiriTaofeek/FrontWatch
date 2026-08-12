# Frontend Application Architecture

Recommended layers:

```text
Routes
 ↓
Page composition
 ↓
Feature modules
 ↓
Data/query layer
 ↓
API client
```

Feature modules:

```text
health
issues
sessions
performance
network
releases
alerts
settings
```

Keep server-state management separate from local UI state.
