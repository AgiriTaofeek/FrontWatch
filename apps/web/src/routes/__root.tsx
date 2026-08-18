import { FrontwatchErrorBoundary, useFrontwatchInit } from "@frontwatch/react";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

// No <QueryClientProvider> here — router.tsx's setupRouterSsrQueryIntegration
// call wraps the whole router tree in one automatically, using the
// per-request QueryClient getRouter() creates. Wrapping it again here
// would just be a second, redundant provider.
export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "FrontWatch" },
		],
	}),
	component: RootComponent,
});

// ADR-024's own stated intent ("apps/web doubles as SDK dogfooding
// target") was never actually wired up — apps/demo was the only real
// consumer of the SDK before this. Real dogfooding via the actual React
// adapter, not the raw core: VITE_FRONTWATCH_PUBLIC_KEY unset (the
// common case — CI, most local dev) means useFrontwatchInit() still runs
// safely every render, it just initializes a disabled client (same
// "bad/missing config never crashes the host app" guarantee client.ts's
// own constructor already provides) — no conditional needed here.
function RootComponent() {
	useFrontwatchInit({
		publicKey: import.meta.env.VITE_FRONTWATCH_PUBLIC_KEY ?? "",
		endpoint:
			import.meta.env.VITE_FRONTWATCH_ENDPOINT ?? "http://localhost:8080",
		environment: import.meta.env.MODE,
	});

	return (
		<RootDocument>
			{/* Wraps only the routed content, not the <html>/<head>/<Scripts>
			shell — a route-level render error shouldn't also take down the
			page shell around it. */}
			<FrontwatchErrorBoundary
				fallback={<p>Something went wrong loading this page.</p>}
			>
				<Outlet />
			</FrontwatchErrorBoundary>
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
