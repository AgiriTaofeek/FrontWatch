# SDK Testing

The SDK is one of the highest-risk components because it runs in customer applications.

## Test Areas

```text
initialization
error capture
fetch
XHR
navigation
performance
session
breadcrumbs
privacy
sampling
buffering
transport
```

## Browser Matrix

Test representative:

```text
Chrome
Safari
Firefox
Edge
```

## Failure Tests

Simulate:

- offline
- blocked transport
- unavailable ingestion
- malformed configuration
- missing browser APIs
- full buffer

## Performance

Measure:

```text
bundle size
startup overhead
CPU
memory
network overhead
```

## Regression

SDK releases should automatically compare key metrics against the previous release.
