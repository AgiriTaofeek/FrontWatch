# Backlog Structure

Use:

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

## Example

```text
E03 Ingestion
  ↓
Secure event ingestion
  ↓
As an SDK...
  ↓
POST /ingest endpoint
  ↓
validation
rate limiting
queue publishing
tests
```

## Story Ownership

Product/BA owns the requirement intent.

Engineering owns implementation decomposition.

## Bug

A bug should reference the affected requirement/story when possible.
