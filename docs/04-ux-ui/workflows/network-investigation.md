# Workflow — Network Investigation

**Goal:** determine whether frontend failures are caused or amplified by network/API behavior.

**Flow:** Issue → network activity → failed request → endpoint → status → latency → release/session correlation.

**Request detail shows (safe metadata only):** method, URL/resource identity, status, duration, timestamp, related issue, related session, related release. Sensitive headers and payloads must not be displayed unless explicitly supported and safely configured.
