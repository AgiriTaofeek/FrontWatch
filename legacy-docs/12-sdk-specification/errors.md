# SDK Error Monitoring

## Automatic Capture

The SDK should capture relevant browser-level errors where supported.

Examples:

```text
uncaught exceptions
unhandled promise rejections
resource loading failures
framework error boundaries
```

## Error Event

Capture:

```text
message
exception type
stack trace
handled state
route
release
environment
session
timestamp
```

## Fingerprinting

The backend ultimately owns issue grouping, but the SDK may provide useful fingerprint inputs.

## Source Context

Where available, capture:

```text
filename
line
column
function
```

## Framework Errors

Framework adapters may provide richer information.

For example:

```text
React error boundary
Vue error handler
Svelte error handling
```

## Manual Capture

Provide a manual API conceptually:

```ts
frontwatch.captureException(error);
frontwatch.captureMessage("Something happened");
```

## Avoid Duplicate Events

Framework instrumentation and global handlers must coordinate to avoid reporting the same failure multiple times.
