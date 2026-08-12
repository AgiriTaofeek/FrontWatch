# Workflow — Network Investigation

## Goal

Determine whether frontend failures are caused or amplified by network/API behavior.

## Flow

```text
Issue
 ↓
Network activity
 ↓
Failed request
 ↓
Endpoint
 ↓
Status
 ↓
Latency
 ↓
Release/session correlation
```

## Request Detail

Show safe metadata such as:

- Method
- URL/resource identity
- Status
- Duration
- Timestamp
- Related issue
- Related session
- Related release

Sensitive headers and payloads must not be displayed unless explicitly supported and safely configured.
