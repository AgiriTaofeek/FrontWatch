# Workflow — Error Investigation

## Goal

Move from a detected error to a root-cause hypothesis quickly.

## Flow

```text
Application Health
      ↓
Error spike
      ↓
Issue
      ↓
Issue summary
      ↓
Impact
      ↓
Timeline
      ↓
Release correlation
      ↓
Affected sessions
      ↓
Stack trace
      ↓
Network/performance evidence
      ↓
Root-cause hypothesis
```

## Issue Summary

The first screen should answer:

- What happened?
- How often?
- When did it start?
- Is it still happening?
- Who is affected?
- Which routes are affected?
- Which release is affected?

## Investigation Evidence

```text
Error
 ├── Stack trace
 ├── Release
 ├── Session
 ├── Breadcrumbs
 ├── Network
 └── Performance
```

## Primary Action

The engineer should be able to move from an issue to the most relevant evidence without manually searching.
