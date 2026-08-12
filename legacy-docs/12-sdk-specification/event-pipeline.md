# SDK Event Pipeline

## Pipeline

```text
Browser signal
      ↓
Instrumentation
      ↓
Create event
      ↓
Attach context
      ↓
Privacy filtering
      ↓
Sampling
      ↓
Buffer
      ↓
Batch
      ↓
Transport
      ↓
Ingestion
```

## Context Attachment

Automatically attach where available:

```text
release
environment
route
session
browser
device
```

## Privacy Before Sampling

Privacy filtering should happen before an event can leave the browser.

## Sampling

Sampling can reduce volume.

Example:

```text
1000 events
   ↓
10% sampling
   ↓
~100 events
```

Error events may need different sampling rules from performance events.

## Buffering

Events should not immediately create one HTTP request each.

## Flush Conditions

Possible conditions:

```text
buffer size
event count
time interval
page lifecycle event
manual flush
```

## Delivery

The SDK should distinguish:

```text
accepted
rejected
retryable
permanently failed
```
