import { recordBreadcrumb } from "./breadcrumbs";
import { captureNavigationEvent } from "./client";

// instrumentation.md §Navigation: "Captures client-side route
// transitions (SPA)... Event shape: {event_type: "navigation",
// from_route, to_route, navigation_type}." Two consumers of the same
// underlying route-change signal, both real: a "navigation" breadcrumb
// (context attached to a *future* error, breadcrumbs.ts) and a
// standalone, independently-queryable navigation event
// (createNavigationEvent, event.ts) — PROGRESS.md's Post-MVP gap
// closure list originally tracked these as two separate gaps for
// exactly this reason (the breadcrumb alone isn't a substitute for a
// queryable event, and vice versa).
//
// Framework-independent by design (ADR-005) — this patches the
// standard History API directly rather than depending on any router's
// own events, the same "core stays framework-independent, adapter-
// specific parameterization is later work" reasoning context.ts's route
// field already documents.

type NavigationType = "push" | "replace" | "pop";

let previousPath: string | undefined;

function recordNavigationIfChanged(navigationType: NavigationType): void {
	const currentPath = window.location.pathname;
	// Skips the very first call (previousPath is still undefined) — that's
	// page load, not a transition, and skips a no-op state change to the
	// same path (e.g. a hash-only update or a replaceState that doesn't
	// actually move the user anywhere) rather than spamming a breadcrumb/
	// event for it. instrumentation.md's Navigation section: query strings
	// are never captured — window.location.pathname already excludes them.
	if (previousPath !== undefined && previousPath !== currentPath) {
		recordBreadcrumb("navigation", `Navigation -> ${currentPath}`);
		captureNavigationEvent({
			fromRoute: previousPath,
			toRoute: currentPath,
			navigationType,
		});
	}
	previousPath = currentPath;
}

// SSR-safety guard — see errors.ts's identical comment for why.
export function registerNavigationInstrumentation(): void {
	if (typeof window === "undefined") {
		return;
	}
	previousPath = window.location.pathname;

	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);

	window.history.pushState = (
		...args: Parameters<typeof history.pushState>
	) => {
		originalPushState(...args);
		recordNavigationIfChanged("push");
	};

	window.history.replaceState = (
		...args: Parameters<typeof history.replaceState>
	) => {
		originalReplaceState(...args);
		recordNavigationIfChanged("replace");
	};

	// Back/forward navigation doesn't go through pushState/replaceState at
	// all — popstate is the only signal for it.
	window.addEventListener("popstate", () => recordNavigationIfChanged("pop"));
}

// Test-only reset — same reasoning as breadcrumbs.ts's own
// __resetBreadcrumbsForTests: this module's state is shared across every
// test file in one bun:test process.
export function __resetNavigationForTests(): void {
	previousPath = undefined;
}
