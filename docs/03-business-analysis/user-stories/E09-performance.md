# E09 — Performance Monitoring

## US-09.01 — Capture Web Vitals
**Priority:** P0

**As a** software engineer, **I want** Core Web Vitals captured, **so that** I can detect user-facing performance degradation.

**Acceptance criteria:** LCP is captured where supported · CLS is captured where supported · INP is captured where supported · metrics can be associated with route and environment.

## US-09.02 — Capture Navigation Performance
**Priority:** P0

**As a** software engineer, **I want** navigation timing captured, **so that** slow page loads can be investigated.

**Acceptance criteria:** navigation timing is captured where supported · data can be aggregated by route · performance data can be correlated with releases.

## US-09.03 — Detect Long Tasks
**Priority:** P1

**As a** software engineer, **I want** long-running browser tasks detected, **so that** main-thread performance problems can be investigated.

**Acceptance criteria:** long tasks are detected where browser APIs permit · events include timing information · collection can be sampled or disabled.

## US-09.04 — Compare Performance Across Releases
**Priority:** P0

**As a** software engineer, **I want** performance compared between releases, **so that** regressions can be detected after deployment.

**Acceptance criteria:** performance metrics can be grouped by release · two releases can be compared · significant metric changes are visible.
