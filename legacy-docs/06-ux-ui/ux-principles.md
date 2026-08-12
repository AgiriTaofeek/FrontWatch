# UX Principles

## 1. Investigation First

FrontWatch's most important job is helping an engineer investigate production behavior.

Dashboards are entry points into investigation, not the destination.

## 2. Context Must Follow the Engineer

If an engineer moves from:

```text
Issue → Session → Network → Release
```

the relevant context should remain available.

The engineer should not repeatedly reconstruct:

- application
- environment
- time range
- release
- issue
- session

## 3. Every Number Needs Context

A metric such as:

```text
Error rate: 4.2%
```

is insufficient.

The UI should make it possible to understand:

- compared with what?
- over what period?
- affecting which environment?
- affecting which routes?
- compared with which release?

## 4. Correlation Must Be Explicit

Examples:

```text
Observed:
Error rate increased 3 minutes after deployment.

Possible correlation:
The increase began shortly after release 4.8.2.

Confirmed:
Only when evidence establishes causality.
```

FrontWatch should never present correlation as certainty.

## 5. Privacy Should Be Understandable

Users should understand:

- what FrontWatch collects
- what is redacted
- what is retained
- where telemetry is stored

## 6. Progressive Disclosure

First layer:

```text
What happened?
How severe is it?
Who is affected?
```

Second layer:

```text
When?
Where?
Which release?
Which browser?
Which route?
```

Third layer:

```text
Stack trace
Breadcrumbs
Network requests
Performance events
Session timeline
```

Fourth layer:

```text
Raw event
Technical metadata
Diagnostic information
```

## 7. No Dead Ends

Every major object should provide useful next actions.

Example:

```text
Issue
 ├── View sessions
 ├── View release
 ├── View affected routes
 ├── View network failures
 └── Search related issues
```

## 8. Trustworthy Missing Data

Never imply:

```text
No problems
```

when the real state is:

```text
No telemetry received
```

These are fundamentally different states.
