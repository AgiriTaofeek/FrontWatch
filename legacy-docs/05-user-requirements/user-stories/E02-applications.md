# E02 — Applications & Environments

## US-02.01 — Create an Application
**Priority:** P0

**As a** software engineer,  
**I want** to register an application,  
**so that** FrontWatch knows which frontend it is monitoring.

### Acceptance Criteria
- An authorized user can create an application.
- An application has a unique identifier.
- Required application metadata is validated.
- The application belongs to exactly one organization.

## US-02.02 — Create Environments
**Priority:** P0

**As a** software engineer,  
**I want** separate environments for an application,  
**so that** development, staging, and production telemetry do not become mixed.

### Acceptance Criteria
- An application can have multiple environments.
- Each environment has a unique identity within the application.
- Telemetry can be associated with an environment.
- Users can filter data by environment.

## US-02.03 — Configure an Application
**Priority:** P0

**As a** software engineer,  
**I want** application monitoring configuration,  
**so that** I can control how FrontWatch observes my application.

### Acceptance Criteria
- Authorized users can view configuration.
- Configuration changes are validated.
- Configuration is scoped to the appropriate application/environment.
- Sensitive credentials are not displayed unnecessarily.

## US-02.04 — Obtain SDK Configuration
**Priority:** P0

**As a** software engineer,  
**I want** application-specific SDK configuration,  
**so that** I can connect my frontend application to FrontWatch.

### Acceptance Criteria
- FrontWatch provides the required project/environment configuration.
- Configuration identifies the correct application.
- Configuration cannot grant dashboard access.
- Configuration can be rotated or revoked.
