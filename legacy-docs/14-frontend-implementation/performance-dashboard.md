# Performance Dashboard

## Goal

Detect frontend performance regressions before customers report them.

## Metrics

```text
LCP
CLS
INP
FCP
TTFB
navigation duration
resource timing
long tasks
```

## Dimensions

```text
route
release
browser
device
environment
```

## Views

```text
Overview
Trend
By route
By release
By browser
By device
```

## Regression Detection

Show:

```text
baseline
current
difference
statistical/threshold signal where available
```

## Drill Down

Example:

```text
LCP regression
 ↓
affected route
 ↓
release
 ↓
sessions
 ↓
network/resource evidence
```

## Visualization

Charts must preserve readability under large time ranges.

Provide aggregation/downsampling rather than rendering millions of points.
