# E17 — Self-Hosted Operations

## US-17.01 — Deploy FrontWatch
**Priority:** P0

**As a** DevOps engineer, **I want** to deploy FrontWatch into infrastructure controlled by my organization, **so that** telemetry remains within our security boundary.

**Acceptance criteria:** installation documentation exists · required services are documented · configuration is externalized · the platform can be deployed without sending telemetry to an external SaaS.

## US-17.02 — Configure Storage
**Priority:** P0

**As a** DevOps engineer, **I want** to configure telemetry storage, **so that** FrontWatch fits our infrastructure and retention requirements.

**Acceptance criteria:** storage configuration is documented · required storage dependencies are explicit · storage failures are observable.

## US-17.03 — Monitor Platform Health
**Priority:** P0

**As a** DevOps engineer, **I want** platform health checks, **so that** I know whether FrontWatch itself is operating correctly.

**Acceptance criteria:** critical components expose health state · dependency failures are visible · health checks can be integrated with infrastructure monitoring.

## US-17.04 — Upgrade FrontWatch
**Priority:** P0

**As a** DevOps engineer, **I want** a predictable upgrade process, **so that** new FrontWatch versions can be deployed safely.

**Acceptance criteria:** upgrade steps are documented · compatibility requirements are documented · data migrations are identified · rollback considerations are documented.
