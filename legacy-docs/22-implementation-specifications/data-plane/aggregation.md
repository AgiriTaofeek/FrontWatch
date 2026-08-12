# Aggregation

Aggregations support fast dashboards without scanning unlimited raw events.

Candidate aggregates:

```text
error count by minute
error count by release
error count by route
network failure rate
latency percentiles
Web Vital distributions
affected sessions
```

Define whether an aggregate is:

```text
exact
approximate
eventually consistent
```

Dashboard correctness must match the declared semantics.
