# E09 — Performance Monitoring

## US-09.01 — Capture Web Vitals
**Priority:** P0

**As a** software engineer,  
**I want** Core Web Vitals captured,  
**so that** I can detect user-facing performance degradation.

### Acceptance Criteria
- LCP is captured where supported.
- CLS is captured where supported.
- INP is captured where supported.
- Metrics can be associated with route and environment.

## US-09.02 — Capture Navigation Performance
**Priority:** P0

**As a** software engineer,  
**I want** navigation timing captured,  
**so that** slow page loads can be investigated.

### Acceptance Criteria
- Navigation timing is captured where supported.
- Data can be aggregated by route.
- Performance data can be correlated with releases.

## US-09.03 — Detect Long Tasks
**Priority:** P1

**As a** software engineer,  
**I want** long-running browser tasks detected,  
**so that** main-thread performance problems can be investigated.

### Acceptance Criteria
- Long tasks are detected where browser APIs permit.
- Events include timing information.
- Collection can be sampled or disabled.

## US-09.04 — Compare Performance Across Releases
**Priority:** P0

**As a** software engineer,  
**I want** performance compared between releases,  
**so that** regressions can be detected after deployment.

### Acceptance Criteria
- Performance metrics can be grouped by release.
- Two releases can be compared.
- Significant metric changes are visible.
