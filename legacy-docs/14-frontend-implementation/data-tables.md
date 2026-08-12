# Data Tables

Observability interfaces often contain large datasets.

## Requirements

Tables should support:

- sorting
- filtering
- pagination
- column visibility
- keyboard navigation
- responsive behavior
- loading state
- empty state
- error state

## Large Data

Prefer server-side filtering and pagination.

Do not fetch thousands of rows solely to implement client-side filtering.

## Virtualization

Use virtualization for very large lists.

## Row Details

Allow drill-down without losing list context.

## URL

Important table filters should be URL-represented where sharing is useful.
