# Data Freshness

## Definition

Data freshness measures the delay between an observed event and its availability for investigation.

```text
event timestamp
      ↓
ingestion
      ↓
processing
      ↓
queryable
```

## Signals

Measure freshness separately for:

```text
errors
network
performance
sessions
aggregates
```

## Degradation

A platform can be:

```text
available
but stale
```

This must not be represented as healthy.

## Dashboard

Expose freshness internally and where useful to customers.

## Alert

Alert when freshness exceeds the agreed SLO.
