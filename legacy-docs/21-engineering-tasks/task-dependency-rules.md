# Task Dependency Rules

Dependencies should reflect technical necessity.

Use stable API/event contracts to let frontend, SDK, backend, infrastructure, and testing work in parallel.

Avoid circular dependencies such as frontend waiting for a perfect backend.

The critical dependency chain is the first vertical slice.
