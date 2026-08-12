# SDK Performance Monitoring

## Metrics

Initial support should include:

```text
LCP
CLS
INP
FCP
TTFB
navigation timing
resource timing
long tasks
```

## Navigation

Capture:

```text
navigation start
route
navigation type
duration
```

## Resource Timing

Capture useful metadata while avoiding unnecessary payload volume.

## Long Tasks

Long tasks can identify main-thread blocking.

Capture:

```text
start
duration
route/session context
```

## Performance Overhead

Performance instrumentation must itself be measured.

The SDK should not significantly distort the metrics it is trying to measure.

## Sampling

Performance telemetry is a strong candidate for configurable sampling.

## Attribution

Where practical, metrics should contain attribution context:

```text
route
resource
navigation
release
browser
device
```
