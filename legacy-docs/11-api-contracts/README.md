# FrontWatch — API Contracts

This phase defines the contracts between the browser SDK, ingestion layer, backend, and dashboard.

## Contract hierarchy

```text
SDK
 ↓
Ingestion API
 ↓
Telemetry Event Contract
 ↓
Processing
 ↓
Query API
 ↓
FrontWatch Web App
```

## Goals

Define:

- API boundaries
- authentication
- request/response shapes
- telemetry envelope
- query filters
- pagination
- errors
- versioning
- idempotency
- rate limiting
- compatibility

## API Families

```text
Control Plane API
Telemetry Ingestion API
Query API
Alert API
Health API
```

## Core Principle

The browser SDK and ingestion API are untrusted-input boundaries.

The dashboard API is an authenticated application API.

These should not share the same security model.
