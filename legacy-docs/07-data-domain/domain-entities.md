# FrontWatch — Domain Entities

## 1. Organization

Represents a customer/company boundary.

Key attributes:

- id
- name
- status
- created_at
- updated_at

Relationships:

```text
Organization
 ├── Memberships
 └── Applications
```

## 2. User

Represents a human user of the FrontWatch platform.

Relationships:

```text
User
 └── Memberships
```

## 3. Membership

Connects a user to an organization and determines their role.

Key attributes:

- id
- organization_id
- user_id
- role
- status
- created_at

## 4. Application

Represents a frontend application being monitored.

Key attributes:

- id
- organization_id
- name
- framework
- status
- created_at
- updated_at

## 5. Environment

Represents where an application is running.

Examples:

```text
development
staging
production
```

An application can have multiple environments.

## 6. Project

Represents the telemetry identity/configuration boundary used by an SDK.

The exact storage representation is intentionally deferred.

## 7. Release

Represents a version of application code.

Possible attributes:

- id
- application_id
- version
- commit_sha
- source_version
- created_at

## 8. Deployment

Represents a release being deployed into an environment.

Possible attributes:

- id
- release_id
- environment_id
- deployed_at
- deployment_source
- metadata

## 9. Event

The canonical telemetry envelope.

Common context:

- event_id
- organization_id
- application_id
- environment_id
- release_id
- session_id
- timestamp
- event_type
- route
- browser
- device

The event payload varies by event type.

## 10. Error

An observed frontend failure.

Possible information:

- message
- exception type
- stack trace
- fingerprint
- source location
- metadata

## 11. Issue

A logical grouping of related error occurrences.

An issue is not an individual event.

```text
Issue
 ├── Occurrence
 ├── Occurrence
 └── Occurrence
```

## 12. Issue Occurrence

A concrete observation belonging to an issue.

It connects an issue with an event and contextual entities.

## 13. Session

A browser/application activity boundary used to reconstruct what happened during a user's experience.

## 14. Breadcrumb

A contextual event in a session timeline.

Categories may include:

- navigation
- interaction
- network
- error
- performance
- custom

## 15. Network Request

Represents observable browser network activity.

Possible attributes:

- method
- normalized URL/resource
- status
- duration
- timestamp
- session
- release
- environment

Sensitive payloads are excluded by default.

## 16. Performance Sample

Represents a performance measurement.

Examples:

- LCP
- CLS
- INP
- FCP
- navigation timing
- resource timing
- long task

## 17. Alert Rule

Defines a condition that should trigger notification.

Example:

```text
error_rate > threshold
for N minutes
```

## 18. Alert

Represents an evaluated occurrence of an alert rule.

Possible states:

```text
triggered
acknowledged
recovered
resolved
```

## 19. Correlation

Represents a useful relationship between observations/entities.

Examples:

```text
Issue ↔ Release
Issue ↔ Session
Issue ↔ Network Request
Performance Regression ↔ Release
```

Correlation is evidence, not automatic proof of causation.

## 20. Health Snapshot

A derived representation of application health over a defined time window.

Health should be computed from underlying evidence rather than treated as primary telemetry.
