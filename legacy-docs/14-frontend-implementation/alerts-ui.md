# Alerts UI

## Alert List

Show:

```text
rule
application
environment
status
triggered time
duration
```

## Rule Builder

A rule should express:

```text
metric
condition
threshold
window
scope
notification
```

## Example

```text
Production error rate
>
5%
for
5 minutes
```

## Alert Detail

Show:

```text
condition
observed value
threshold
timeline
related issues
```

## States

```text
triggered
acknowledged
recovered
resolved
```

## UX Principle

Alert configuration should be understandable by engineers without requiring knowledge of the underlying query engine.
