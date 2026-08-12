# Workflow — Onboarding

**Goal:** get an engineering team from account creation to receiving its first telemetry.

**Flow:** create organization → create application → select framework → select environment → install SDK → configure SDK → deploy/test → receive first event → verify connection → application health.

**Success state:** "FrontWatch is receiving telemetry — Application: Customer Portal, Environment: Production, Last event: `<time>`."

**Failure states the UI must help diagnose:** SDK not initialized, invalid project configuration, no events received, events rejected, network blocked, incorrect environment, SDK runtime error.

**Key UX requirement:** never just show "No data" — tell the engineer what to check next.
