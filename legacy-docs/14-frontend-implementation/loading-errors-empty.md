# Loading, Error & Empty States

## Loading

Use contextual loading indicators.

Avoid replacing the entire application with a spinner for small data refreshes.

## Skeletons

Use skeletons when layout stability matters.

## Empty

Differentiate:

```text
No issues
```

from:

```text
No data for selected time range
```

and:

```text
Telemetry unavailable
```

## Error

Show actionable error states.

Example:

```text
Unable to load issue data.
Try again.
Request ID: ...
```

## Partial Data

If one widget fails while others succeed, do not destroy the entire dashboard.

## Stale Data

Where applicable, communicate when displayed data may be stale.
