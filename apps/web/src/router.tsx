import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

// getRouter() is called fresh per SSR request by TanStack Start — that
// per-call boundary is exactly what makes createQueryClient() here
// produce a genuinely per-request QueryClient (see query-client.ts's
// own comment for the real bug this fixes). setupRouterSsrQueryIntegration
// (the official @tanstack/react-router-ssr-query helper, confirmed
// against the framework's own start-basic-react-query example) wires
// dehydrate/hydrate AND wraps the router's component tree in
// <QueryClientProvider> automatically — __root.tsx no longer needs to
// do that itself.
export function getRouter() {
	const queryClient = createQueryClient();

	const router = createRouter({
		routeTree,
		scrollRestoration: true,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}
