# Frontend Performance

FrontWatch's dashboard must remain fast while handling large telemetry datasets.

## Principles

- server-side filtering
- pagination
- virtualization
- chart downsampling
- lazy route loading
- code splitting
- selective prefetching

## Initial Load

Prioritize:

```text
application shell
navigation
critical dashboard data
```

Lazy-load heavy investigation features.

## Rendering

Avoid unnecessary rerenders from:

- global state changes
- unstable object references
- large telemetry arrays

## Charts

Never render raw high-volume telemetry directly when aggregation is possible.

## Memory

Long session timelines and large tables require explicit memory controls.

## Performance Monitoring

Monitor the dashboard itself with appropriate tooling and internal metrics.
