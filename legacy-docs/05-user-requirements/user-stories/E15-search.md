# E15 — Search & Filtering

## US-15.01 — Filter by Time
**Priority:** P0

**As a** software engineer,  
**I want** to choose a time range,  
**so that** I can focus investigation on the incident period.

### Acceptance Criteria
- Common time ranges are available.
- Custom ranges can be selected.
- All displayed data respects the selected range.

## US-15.02 — Filter by Environment
**Priority:** P0

**As a** software engineer,  
**I want** to filter by environment,  
**so that** production data is not mixed with staging data.

### Acceptance Criteria
- Environment filtering is available where relevant.
- Filters persist during an investigation where appropriate.

## US-15.03 — Filter by Release
**Priority:** P0

**As a** software engineer,  
**I want** to filter telemetry by release,  
**so that** I can investigate deployment-specific problems.

### Acceptance Criteria
- Release filters are available.
- Results contain only matching telemetry.

## US-15.04 — Filter by Browser and Device
**Priority:** P0

**As a** software engineer,  
**I want** browser/device filters,  
**so that** I can determine whether an issue affects a specific client population.

### Acceptance Criteria
- Browser filtering is supported.
- Device filtering is supported.
- Filters can be combined with time and environment.
