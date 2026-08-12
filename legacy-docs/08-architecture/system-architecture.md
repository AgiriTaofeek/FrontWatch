# FrontWatch — System Architecture

## 1. Major Components

### 1.1 Browser SDK

Responsible for:

- instrumentation
- event capture
- privacy filtering
- redaction
- sampling
- batching
- transport
- local buffering where appropriate

The SDK must never depend on the FrontWatch dashboard being available.

### 1.2 Ingestion Layer

Responsible for:

- accepting telemetry
- authenticating project identity
- validating payloads
- enforcing payload limits
- rate limiting
- accepting batches
- returning fast acknowledgements

The ingestion layer should avoid expensive processing synchronously.

### 1.3 Event Pipeline

Responsible for:

- normalization
- enrichment
- event classification
- fingerprint generation
- issue grouping
- aggregation
- routing to storage

### 1.4 Control Plane API

Responsible for:

- authentication
- organizations
- users
- applications
- environments
- releases
- configuration
- alerts
- permissions

### 1.5 Query Layer

Responsible for:

- issue queries
- session queries
- event queries
- performance queries
- network queries
- release comparisons
- dashboard aggregates

### 1.6 Storage

The architecture should support different storage characteristics for:

```text
Control data
High-volume telemetry
Aggregated metrics
Search/index data
Long-term objects
```

Do not force all data into one storage system without evaluating access patterns.

### 1.7 Web Application

Responsible for:

- dashboards
- issue investigation
- session investigation
- performance investigation
- release investigation
- configuration

## 2. Control Plane vs Telemetry Plane

### Control Plane

Low-volume, transactional, strongly consistent business data.

Examples:

```text
Organization
User
Application
Environment
Release
Alert Rule
```

### Telemetry Plane

High-volume, append-oriented observational data.

Examples:

```text
Error
Network
Performance
Breadcrumb
Session events
```

This separation lets each side scale according to its workload.

## 3. Synchronous vs Asynchronous Work

### Synchronous

Keep fast operations synchronous:

- authentication
- project lookup
- application configuration
- simple control-plane CRUD
- ingestion acknowledgement

### Asynchronous

Move expensive work out of the request path:

- parsing
- enrichment
- fingerprinting
- aggregation
- issue grouping
- metric computation
- indexing
- retention cleanup

## 4. Golden Event Path

```text
Browser
 ↓
SDK
 ↓
Ingestion
 ↓
Durable queue
 ↓
Worker
 ↓
Normalize
 ↓
Privacy enforcement
 ↓
Fingerprint
 ↓
Persist
 ↓
Aggregate
 ↓
Query
 ↓
Dashboard
```

The customer application should not wait for the processing pipeline.
