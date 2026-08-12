# E08 — Network Monitoring

## US-08.01 — Capture Network Requests
**Priority:** P0

**As a** software engineer,  
**I want** frontend network activity captured,  
**so that** API failures can be correlated with frontend failures.

### Acceptance Criteria
- Supported requests can be observed.
- URL, method, status, and duration are available where permitted.
- Request bodies and sensitive headers are not captured by default.
- Network capture does not break requests.

## US-08.02 — Detect Failed Requests
**Priority:** P0

**As a** software engineer,  
**I want** failed API/network requests identified,  
**so that** backend/frontend integration failures are visible.

### Acceptance Criteria
- Relevant HTTP failures can be identified.
- Network failures and timeouts can be identified where observable.
- Failures can be associated with sessions and issues.

## US-08.03 — Investigate API Performance
**Priority:** P0

**As a** software engineer,  
**I want** API latency aggregated,  
**so that** I can identify slow dependencies.

### Acceptance Criteria
- Request duration is measured.
- Performance can be aggregated by endpoint or normalized resource identity.
- Engineers can filter by time and environment.
