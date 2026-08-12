# Information Architecture

## Top-Level Structure

```text
FrontWatch
│
├── Overview
│
├── Applications
│   └── Application
│       ├── Health
│       ├── Issues
│       ├── Performance
│       ├── Network
│       ├── Sessions
│       ├── Releases
│       └── Alerts
│
├── Explore
│   ├── Issues
│   ├── Events
│   └── Search
│
├── Settings
│   ├── Application
│   ├── SDK
│   ├── Privacy
│   ├── Alerts
│   └── Releases
│
└── Organization
    ├── Members
    ├── Roles
    └── Settings
```

## Application Context

The selected application and environment should remain persistent throughout investigation.

Example:

```text
Customer Banking Portal
Production
Last 24 hours
```

This context should be visible without consuming excessive screen space.

## Core Entities

```text
Organization
Application
Environment
Release
Deployment
Issue
Event
Session
User
Route
Network Request
Performance Metric
Alert
```

## Entity Relationships

```text
Organization
    ↓
Application
    ↓
Environment
    ↓
Release
    ↓
Events
    ├── Issues
    ├── Sessions
    ├── Network
    └── Performance
```
