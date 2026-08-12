# Frontend Data Fetching

Use a dedicated server-state/query layer.

Requirements:

- caching
- request cancellation
- stale/loading states
- retries only where safe
- pagination/infinite loading
- error handling

Analytical queries must respect backend limits.

Large session timelines should load incrementally rather than fetching everything at once.
