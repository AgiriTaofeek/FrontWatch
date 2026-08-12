# FrontWatch — Entity Model

## Control Plane

### Organization

```text
Organization
- id
- name
- status
- created_at
- updated_at
```

### User

```text
User
- id
- email
- name
- status
- created_at
- updated_at
```

### Membership

```text
Membership
- id
- organization_id
- user_id
- role
- status
- created_at
```

Constraint:

```text
unique(organization_id, user_id)
```

### Application

```text
Application
- id
- organization_id
- name
- framework
- status
- created_at
- updated_at
```

### Environment

```text
Environment
- id
- application_id
- name
- type
- status
- created_at
```

Suggested environment types:

```text
development
staging
production
custom
```

### Project

```text
Project
- id
- application_id
- environment_id
- public_key
- status
- created_at
```

### Release

```text
Release
- id
- application_id
- version
- commit_sha
- metadata
- created_at
```

### Deployment

```text
Deployment
- id
- release_id
- environment_id
- deployed_at
- source
- metadata
```

## Telemetry

### Event

```text
Event
- event_id
- organization_id
- application_id
- environment_id
- release_id
- session_id
- event_type
- client_timestamp
- server_received_at
- schema_version
- route
- client_context
- payload
```

The exact physical representation depends on the telemetry storage engine.

### Session

```text
Session
- session_id
- application_id
- environment_id
- started_at
- last_seen_at
- browser
- device
- metadata
```

### Issue

```text
Issue
- id
- application_id
- environment_id
- fingerprint
- title
- status
- first_seen_at
- last_seen_at
- occurrence_count
```

### Issue Occurrence

```text
IssueOccurrence
- id
- issue_id
- event_id
- session_id
- release_id
- occurred_at
- route
```

### Alert Rule

```text
AlertRule
- id
- application_id
- environment_id
- name
- condition
- threshold
- window
- notification_config
- enabled
- created_at
```

### Alert

```text
Alert
- id
- alert_rule_id
- triggered_at
- recovered_at
- status
- observed_value
- context
```

### Audit Record

```text
AuditRecord
- id
- organization_id
- actor_id
- action
- resource_type
- resource_id
- timestamp
- metadata
```
