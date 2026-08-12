# E07 — Breadcrumbs & Timeline

## US-07.01 — Capture Navigation Breadcrumbs
**Priority:** P0

**As a** software engineer,  
**I want** navigation events captured,  
**so that** I can see where the user was before a failure.

### Acceptance Criteria
- Relevant navigation events are recorded.
- Events contain timestamps.
- Routes can be displayed.
- Sensitive URL information can be filtered.

## US-07.02 — Capture Interaction Breadcrumbs
**Priority:** P0

**As a** software engineer,  
**I want** useful interaction context,  
**so that** I can understand what the user did before an error.

### Acceptance Criteria
- Supported interactions can be captured.
- Sensitive input values are never captured by default.
- Interaction data can be disabled or sampled.
- Breadcrumb capture does not materially degrade the application.

## US-07.03 — View Timeline
**Priority:** P0

**As a** software engineer,  
**I want** a chronological event timeline,  
**so that** I can reconstruct an incident.

### Acceptance Criteria
- Events appear in chronological order.
- Events identify their category.
- Important events can link to related telemetry.
- The timeline can handle sessions with large event counts.
