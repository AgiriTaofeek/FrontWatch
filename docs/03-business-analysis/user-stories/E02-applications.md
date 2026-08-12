# E02 — Applications & Environments

## US-02.01 — Create an Application
**Priority:** P0

**As a** software engineer, **I want** to register an application, **so that** FrontWatch knows which frontend it is monitoring.

**Acceptance criteria:** an authorized user can create an application · an application has a unique identifier · required application metadata is validated · the application belongs to exactly one organization.

## US-02.02 — Create Environments
**Priority:** P0

**As a** software engineer, **I want** separate environments for an application, **so that** development, staging, and production telemetry do not become mixed.

**Acceptance criteria:** an application can have multiple environments · each environment has a unique identity within the application · telemetry can be associated with an environment · users can filter data by environment.

## US-02.03 — Configure an Application
**Priority:** P0

**As a** software engineer, **I want** application monitoring configuration, **so that** I can control how FrontWatch observes my application.

**Acceptance criteria:** authorized users can view configuration · configuration changes are validated · configuration is scoped to the appropriate application/environment · sensitive credentials are not displayed unnecessarily.

## US-02.04 — Obtain SDK Configuration
**Priority:** P0

**As a** software engineer, **I want** application-specific SDK configuration, **so that** I can connect my frontend application to FrontWatch.

**Acceptance criteria:** FrontWatch provides the required project/environment configuration · configuration identifies the correct application · configuration cannot grant dashboard access · configuration can be rotated or revoked.
