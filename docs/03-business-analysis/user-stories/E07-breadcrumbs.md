# E07 — Breadcrumbs & Timeline

## US-07.01 — Capture Navigation Breadcrumbs
**Priority:** P0

**As a** software engineer, **I want** navigation events captured, **so that** I can see where the user was before a failure.

**Acceptance criteria:** relevant navigation events are recorded · events contain timestamps · routes can be displayed · sensitive URL information can be filtered.

## US-07.02 — Capture Interaction Breadcrumbs
**Priority:** P0

**As a** software engineer, **I want** useful interaction context, **so that** I can understand what the user did before an error.

**Acceptance criteria:** supported interactions can be captured · sensitive input values are never captured by default · interaction data can be disabled or sampled · breadcrumb capture does not materially degrade the application.

## US-07.03 — View Timeline
**Priority:** P0

**As a** software engineer, **I want** a chronological event timeline, **so that** I can reconstruct an incident.

**Acceptance criteria:** events appear in chronological order · events identify their category · important events can link to related telemetry · the timeline can handle sessions with large event counts.
