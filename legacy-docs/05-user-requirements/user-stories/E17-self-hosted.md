# E17 — Self-Hosted Operations

## US-17.01 — Deploy FrontWatch
**Priority:** P0

**As a** DevOps engineer,  
**I want** to deploy FrontWatch into infrastructure controlled by my organization,  
**so that** telemetry remains within our security boundary.

### Acceptance Criteria
- Installation documentation exists.
- Required services are documented.
- Configuration is externalized.
- The platform can be deployed without sending telemetry to an external SaaS.

## US-17.02 — Configure Storage
**Priority:** P0

**As a** DevOps engineer,  
**I want** to configure telemetry storage,  
**so that** FrontWatch fits our infrastructure and retention requirements.

### Acceptance Criteria
- Storage configuration is documented.
- Required storage dependencies are explicit.
- Storage failures are observable.

## US-17.03 — Monitor Platform Health
**Priority:** P0

**As a** DevOps engineer,  
**I want** platform health checks,  
**so that** I know whether FrontWatch itself is operating correctly.

### Acceptance Criteria
- Critical components expose health state.
- Dependency failures are visible.
- Health checks can be integrated with infrastructure monitoring.

## US-17.04 — Upgrade FrontWatch
**Priority:** P0

**As a** DevOps engineer,  
**I want** a predictable upgrade process,  
**so that** new FrontWatch versions can be deployed safely.

### Acceptance Criteria
- Upgrade steps are documented.
- Compatibility requirements are documented.
- Data migrations are identified.
- Rollback considerations are documented.
