# Release & Deployment Dashboard

## Goal

Answer:

```text
Did the latest deployment cause a problem?
```

## Release View

Show:

```text
version
commit
created
deployment time
environment
health before
health after
```

## Comparison

Compare releases across:

```text
errors
issues
performance
network failures
affected sessions
```

## Deployment Marker

Timeline charts should visually identify deployments.

## Regression Workflow

```text
Deployment
 ↓
health change
 ↓
new issue
 ↓
affected route
 ↓
investigation
```

## Future Integration

Deployment providers/CI systems can push release/deployment metadata.
