# API Handler Implementation

## Handler Responsibilities

Handlers should:

1. authenticate
2. authorize
3. parse input
4. validate request shape
5. call application service
6. map result to response
7. map errors consistently

## Handler Should Not

Handlers should not contain:

- business rules
- SQL
- ClickHouse queries
- complex telemetry processing

## Request Flow

```text
HTTP
 ↓
Middleware
 ↓
Handler
 ↓
Application Service
 ↓
Repository / Query
 ↓
Response
```

## Validation

Validate:

- required fields
- enum values
- lengths
- ranges
- timestamps
- pagination
- filters

## Response Models

Do not expose internal domain/storage objects directly.

Use explicit API response DTOs.
