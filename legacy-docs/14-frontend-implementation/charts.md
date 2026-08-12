# Charts & Visualization

## Chart Principles

Charts should answer a specific operational question.

Examples:

```text
Is error rate increasing?
Did deployment change performance?
Which route is affected?
```

## Time Series

Use time-series aggregation appropriate to the selected range.

## Downsampling

Do not render every raw event for long periods.

```text
raw events
 ↓
time buckets
 ↓
chart
```

## States

Charts must distinguish:

```text
zero
no data
loading
partial data
query error
```

## Accessibility

Charts should have:

- text summaries
- accessible labels
- keyboard-accessible controls
- non-color-only indicators

## Comparison

Support clear comparison of:

```text
release A vs release B
current vs baseline
```
