# FrontWatch — Engineering Tasks

This phase turns the engineering roadmap into an executable backlog.

## Hierarchy

```text
Epic → Feature → User Story → Engineering Task → Subtask
```

## Runtime boundary

```text
Control Plane → TypeScript + Bun
Data Plane    → Go
Browser SDK   → TypeScript
Frontend      → TypeScript
```

## MVP loop

```text
Browser SDK → Go ingestion → Redpanda → Go processing → Storage → Bun API → Frontend → Engineer investigation
```
