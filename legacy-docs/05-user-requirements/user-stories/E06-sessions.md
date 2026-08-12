# E06 — Sessions & User Context

## US-06.01 — Identify Sessions
**Priority:** P0

**As a** software engineer,  
**I want** telemetry associated with a session,  
**so that** I can understand a user's sequence of events.

### Acceptance Criteria
- Sessions receive identifiers.
- Related telemetry can reference the session.
- Session identifiers do not expose sensitive user information.

## US-06.02 — View Session Context
**Priority:** P0

**As a** software engineer,  
**I want** to inspect session activity,  
**so that** I can understand what happened before an error.

### Acceptance Criteria
- A session can be opened from an issue.
- Relevant navigation, interaction, network, and error events are shown.
- Events are ordered chronologically.
- Missing event categories do not break the timeline.

## US-06.03 — Associate Optional User Context
**Priority:** P1

**As a** software engineer,  
**I want** optional pseudonymous user context,  
**so that** I can understand affected-user scope without exposing unnecessary identity data.

### Acceptance Criteria
- User context is opt-in/configurable.
- Sensitive identity data is not collected by default.
- Authorized engineers can see permitted user context.
- Privacy controls can remove or redact it.
