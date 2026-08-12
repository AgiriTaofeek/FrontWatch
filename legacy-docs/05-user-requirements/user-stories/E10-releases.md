# E10 — Releases & Deployments

## US-10.01 — Register a Release
**Priority:** P0

**As a** software engineer,  
**I want** to identify application releases,  
**so that** telemetry can be connected to the code version producing it.

### Acceptance Criteria
- A release has a unique identifier.
- Releases belong to an application.
- Telemetry can reference a release.

## US-10.02 — Associate Deployments
**Priority:** P0

**As a** DevOps engineer,  
**I want** deployments recorded,  
**so that** I can correlate incidents with deployment activity.

### Acceptance Criteria
- Deployment time is recorded.
- Environment is recorded.
- Release is recorded.
- Deployment history is queryable.

## US-10.03 — View Release Health
**Priority:** P0

**As a** software engineer,  
**I want** health metrics by release,  
**so that** I can determine whether a deployment introduced a problem.

### Acceptance Criteria
- Error activity can be viewed by release.
- Performance can be viewed by release.
- Release health can be compared with previous releases.
