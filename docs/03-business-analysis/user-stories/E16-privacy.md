# E16 — Privacy & Data Controls

## US-16.01 — Configure Data Redaction
**Priority:** P0

**As a** security-conscious engineering team, **I want** configurable data redaction, **so that** confidential customer information does not enter telemetry.

**Acceptance criteria:** redaction rules can be configured · redaction is applied consistently · protected data is not exposed in dashboards · configuration is auditable.

## US-16.02 — Configure Collection
**Priority:** P0

**As a** software engineer, **I want** to control telemetry categories, **so that** FrontWatch collects only what the application requires.

**Acceptance criteria:** telemetry categories can be enabled/disabled where supported · disabled telemetry is not transmitted · configuration changes are scoped correctly.

## US-16.03 — Configure Retention
**Priority:** P0

**As a** DevOps engineer, **I want** configurable retention policies, **so that** telemetry is retained according to organizational requirements.

**Acceptance criteria:** retention duration can be configured · expired telemetry is removed according to policy · retention applies consistently across supported stores.
