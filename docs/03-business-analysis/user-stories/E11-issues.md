# E11 — Issue Management

## US-11.01 — Create an Issue
**Priority:** P0

**As the** FrontWatch platform, **I want** qualifying telemetry grouped into issues, **so that** engineers can work on problems rather than individual events.

**Acceptance criteria:** a qualifying event creates or updates an issue · issues have stable identifiers · issue metadata includes first-seen and last-seen information.

## US-11.02 — View Issue Impact
**Priority:** P0

**As a** software engineer, **I want** issue impact summarized, **so that** I can prioritize customer-facing problems.

**Acceptance criteria:** occurrence count is available · affected sessions are available · affected users are available where user context exists · affected routes and releases are available where known.

## US-11.03 — Resolve an Issue
**Priority:** P0

**As a** software engineer, **I want** to mark an issue resolved, **so that** the team knows which problems have been addressed.

**Acceptance criteria:** authorized users can resolve issues · resolution state is visible · new occurrences after resolution can reopen or otherwise flag the issue according to defined rules.
