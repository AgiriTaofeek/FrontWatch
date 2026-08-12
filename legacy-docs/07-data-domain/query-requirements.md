# FrontWatch — Query Requirements

The data model must support the questions engineers actually ask.

## Application Health

```text
Is the application healthy?
What is the current error rate?
What changed recently?
```

## Error Investigation

```text
Show occurrences of this issue.
When did it start?
Which releases are affected?
Which routes are affected?
Which sessions are affected?
```

## Release Investigation

```text
What changed after deployment?
Compare release A and B.
Did error rate increase?
Did performance regress?
```

## Session Investigation

```text
Show this session's timeline.
What happened before the error?
Which network requests failed?
```

## Performance Investigation

```text
Which routes have poor LCP?
Which release introduced the regression?
Which browser/device is affected?
```

## Network Investigation

```text
Which endpoints fail most?
Which endpoints are slow?
Are failures correlated with frontend issues?
```

## Alert Evaluation

```text
Has the alert condition crossed its threshold?
For how long?
Has it recovered?
```

## Query Design Principles

The eventual architecture should optimize for:

1. Recent operational queries.
2. Time-windowed telemetry.
3. Aggregations.
4. High-cardinality filtering.
5. Issue/session drill-down.
6. Release comparisons.
7. Predictable investigation latency.

The storage technology is deliberately not chosen yet.
