# Workflow — Onboarding

## Goal

Get an engineering team from account creation to receiving its first telemetry.

## Flow

```text
Create organization
      ↓
Create application
      ↓
Select framework
      ↓
Select environment
      ↓
Install SDK
      ↓
Configure SDK
      ↓
Deploy/test
      ↓
Receive first event
      ↓
Verify connection
      ↓
Application health
```

## Success State

The user should see:

```text
FrontWatch is receiving telemetry
Application: Customer Portal
Environment: Production
Last event: <time>
```

## Failure States

The UI should help identify:

- SDK not initialized
- Invalid project configuration
- No events received
- Events rejected
- Network blocked
- Incorrect environment
- SDK runtime error

## Key UX Requirement

Do not simply display "No data."

Tell the engineer what to check next.
