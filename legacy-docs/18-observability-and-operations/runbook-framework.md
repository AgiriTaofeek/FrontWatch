# Runbook Framework

Every important operational alert should link to a runbook.

## Structure

```text
Title
Symptoms
Impact
Likely causes
Initial checks
Detailed investigation
Mitigation
Recovery
Verification
Escalation
Post-incident actions
```

## Example

### Queue Lag

Checks:

```text
queue depth
consumer health
worker errors
ClickHouse latency
worker CPU/memory
```

Mitigation may include:

```text
scale workers
restore dependency
reduce expensive workloads
```

## Quality

Runbooks must be tested by someone who did not author them.
