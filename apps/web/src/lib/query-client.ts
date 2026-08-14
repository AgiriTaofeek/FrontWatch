import { QueryClient } from "@tanstack/react-query";

// application-architecture.md §"Server state": "Cache short-lived —
// telemetry is not assumed immutable." A short staleTime instead of
// TanStack Query's default-forever-fresh assumption.
//
// A factory, not a shared module-level instance — TanStack Query's own
// SSR guide is explicit that a QueryClient created at file-root scope
// "makes the cache shared between all requests," which leaks stale (or
// another user's) data across unrelated SSR requests within the same
// server process. Confirmed the hard way, not just from the docs:
// creating an alert rule via a real POST, then re-fetching its list
// page's SSR HTML in the same running `vite dev` process, kept
// rendering the pre-creation empty state — the module-level
// `queryClient` this factory replaced had already cached that empty
// result on an earlier request and never invalidated it for a
// different one. `router.tsx`'s `getRouter()` — called fresh per
// request by TanStack Start — calls this factory fresh every time.
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});
}
