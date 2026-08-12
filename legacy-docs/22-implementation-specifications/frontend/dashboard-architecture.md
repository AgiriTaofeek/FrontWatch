# Dashboard Architecture

Core navigation:

```text
Application
├── Health
├── Issues
│   └── Issue Detail
├── Sessions
├── Performance
├── Network
├── Releases
└── Alerts
```

The primary investigation flow should remain:

```text
Health signal
→ Issue
→ Occurrence
→ Session/context
→ Release/network/performance evidence
```

Avoid dashboards that present metrics without a path to investigation.
