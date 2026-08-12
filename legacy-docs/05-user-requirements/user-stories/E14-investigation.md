# E14 — Investigation & Correlation

## US-14.01 — Investigate an Issue
**Priority:** P0

**As a** software engineer,  
**I want** one investigation view containing relevant evidence,  
**so that** I can diagnose production failures quickly.

### Acceptance Criteria
- Issue details are shown.
- Occurrence trends are shown.
- Affected sessions are available.
- Relevant breadcrumbs are available.
- Network failures are available.
- Release context is available.
- Performance context is available where relevant.

## US-14.02 — Correlate Issues With Releases
**Priority:** P0

**As a** software engineer,  
**I want** issues correlated with releases,  
**so that** I can identify deployments that introduced regressions.

### Acceptance Criteria
- Issue occurrences can be grouped by release.
- Release timing is visible.
- Engineers can compare before/after behavior.

## US-14.03 — Investigate Session Timeline
**Priority:** P0

**As a** software engineer,  
**I want** to reconstruct a customer's session,  
**so that** I can understand the sequence leading to failure.

### Acceptance Criteria
- Session events are ordered.
- Navigation, interaction, network, performance, and errors can be correlated.
- Sensitive values remain protected.

## US-14.04 — Surface Root-Cause Evidence
**Priority:** P0

**As a** software engineer,  
**I want** FrontWatch to surface correlated evidence,  
**so that** I can form a root-cause hypothesis faster.

### Acceptance Criteria
- Relevant correlations are visible.
- Evidence is traceable to underlying telemetry.
- FrontWatch does not claim certainty when evidence is insufficient.
