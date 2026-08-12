# Alerting Strategy

## Alert Categories

```text
availability
latency
error rate
queue
storage
capacity
security
backup
certificate
deployment
```

## Alert Quality

An alert should answer:

```text
What is wrong?
How severe is it?
What is affected?
What should I check?
```

## Avoid

Do not alert on every transient error.

Prefer sustained symptoms and actionable thresholds.

## Severity

Define:

```text
critical
warning
info
```

## Deduplication

Related alerts should be grouped to prevent alert storms.

## Recovery

Alerts should automatically resolve when the underlying condition recovers where appropriate.
