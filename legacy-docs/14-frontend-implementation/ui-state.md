# UI State Architecture

Separate state into three categories.

## Server State

Owned by the API/query layer.

```text
issues
events
health
releases
```

## URL State

Used when state should be shareable.

```text
time range
environment
release
route
browser
status
```

## Local UI State

Temporary interaction state.

Examples:

```text
modal open
expanded panel
selected table row
active tab
```

## Avoid Global State

Do not place every UI value into one global store.

## State Rule

Ask:

```text
Does the server own it?
Should it be shareable?
Is it only local UI state?
```

Then choose the appropriate state location.
