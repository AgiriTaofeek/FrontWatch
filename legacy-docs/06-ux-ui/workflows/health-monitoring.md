# Workflow — Application Health Monitoring

## Goal

Give engineers and CTOs a fast answer to:

> Is the application healthy right now?

## Overview

```text
Application
 ↓
Health
 ├── Error health
 ├── Performance health
 ├── Network health
 ├── Release health
 └── Telemetry health
```

## Health Dashboard

The first screen should show:

- Current health state
- Error rate
- Error trend
- Performance metrics
- Failed requests
- Active issues
- Latest deployment
- Release health
- Telemetry freshness

## Critical Distinction

The system must distinguish:

```text
Healthy
```

from:

```text
No telemetry
```

and:

```text
Telemetry stale
```

A lack of data must never silently appear healthy.
