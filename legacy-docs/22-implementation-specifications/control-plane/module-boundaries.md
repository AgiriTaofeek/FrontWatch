# Control Plane Module Boundaries

Recommended modules:

```text
auth
organizations
memberships
applications
environments
projects
credentials
releases
alerts
audit
telemetry-query
```

Each module should expose application-level operations rather than leaking database implementation details.

Cross-module dependencies should be intentional and one-directional where possible.
