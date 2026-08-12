# SDK Network Monitoring

## Goal

Understand frontend network behavior without capturing sensitive content by default.

## Capture Candidates

```text
fetch
XMLHttpRequest
navigation/resource timing
```

## Capture

Safe metadata:

```text
method
normalized resource
status
duration
timestamp
outcome
```

## Do Not Capture by Default

```text
Authorization headers
cookies
request bodies
response bodies
passwords
payment data
```

## Resource Normalization

Avoid treating every dynamic URL as a separate high-cardinality resource.

Example:

```text
/api/users/123
/api/users/456
```

should potentially normalize to:

```text
/api/users/:id
```

## Failed Requests

Network failures should be correlated with:

- current route
- session
- release
- active issue

## Fetch Instrumentation

Instrumentation must preserve application semantics.

It must not alter:

- request behavior
- response behavior
- promise behavior
- error behavior

## XHR

The same principle applies to XMLHttpRequest instrumentation.
