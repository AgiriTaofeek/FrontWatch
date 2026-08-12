# Go Ingestion Service

## Flow

```text
HTTP request
 ↓
request limits
 ↓
credential validation
 ↓
schema validation
 ↓
privacy/basic normalization
 ↓
rate limit/quota
 ↓
Redpanda
 ↓
response
```

## Requirements

- bounded request body
- bounded event count
- timeouts
- rate limits
- project-scoped credential
- safe errors
- request metrics
- correlation ID

The ingestion service must never become a bottleneck that takes down customer applications.
