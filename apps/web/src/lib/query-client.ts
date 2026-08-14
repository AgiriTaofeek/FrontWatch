import { QueryClient } from "@tanstack/react-query";

// application-architecture.md §"Server state": "Cache short-lived —
// telemetry is not assumed immutable." A short staleTime instead of
// TanStack Query's default-forever-fresh assumption.
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
		},
	},
});
