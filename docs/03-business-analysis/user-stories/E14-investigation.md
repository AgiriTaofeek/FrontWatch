# E14 — Investigation & Correlation

## US-14.01 — Investigate an Issue
**Priority:** P0

**As a** software engineer, **I want** one investigation view containing relevant evidence, **so that** I can diagnose production failures quickly.

**Acceptance criteria:** issue details are shown · occurrence trends are shown · affected sessions are available · relevant breadcrumbs are available · network failures are available · release context is available · performance context is available where relevant.

## US-14.02 — Correlate Issues With Releases
**Priority:** P0

**As a** software engineer, **I want** issues correlated with releases, **so that** I can identify deployments that introduced regressions.

**Acceptance criteria:** issue occurrences can be grouped by release · release timing is visible · engineers can compare before/after behavior.

## US-14.03 — Investigate Session Timeline
**Priority:** P0

**As a** software engineer, **I want** to reconstruct a customer's session, **so that** I can understand the sequence leading to failure.

**Acceptance criteria:** session events are ordered · navigation, interaction, network, performance, and errors can be correlated · sensitive values remain protected.

## US-14.04 — Surface Root-Cause Evidence
**Priority:** P0

**As a** software engineer, **I want** FrontWatch to surface correlated evidence, **so that** I can form a root-cause hypothesis faster.

**Acceptance criteria:** relevant correlations are visible · evidence is traceable to underlying telemetry · FrontWatch does not claim certainty when evidence is insufficient.
