# Application Layer

The application layer orchestrates use cases.

Example:

```text
HTTP Handler
    ↓
IssueInvestigationService
    ↓
Issue repository
Session repository
Telemetry query
Release repository
    ↓
Response model
```

## Responsibilities

Application services should:

- validate business intent
- coordinate domain operations
- enforce authorization boundaries
- call repositories/interfaces
- produce application-level results

## Should Not

Application services should not:

- parse HTTP directly
- build SQL directly
- know ClickHouse table names
- manipulate HTTP headers
- contain framework-specific code

## Example Use Cases

```text
CreateApplication
CreateEnvironment
RegisterRelease
IngestTelemetry
GetApplicationHealth
GetIssueInvestigation
GetSessionTimeline
CreateAlertRule
AcknowledgeAlert
```
