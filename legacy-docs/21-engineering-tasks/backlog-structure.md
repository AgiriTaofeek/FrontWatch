# Backlog Structure

```text
Epic
 ↓
Feature
 ↓
User Story
 ↓
Engineering Task
 ↓
Subtask
```

Example:
```text
E04 Ingestion
→ Secure event ingestion
→ receive browser telemetry
→ endpoint
→ event envelope
→ validation
→ authentication
→ rate limiting
→ queue
→ metrics
→ integration tests
```

Product/BA owns requirement intent. Engineering owns implementation decomposition.
