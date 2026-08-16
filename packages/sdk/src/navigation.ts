import { recordBreadcrumb } from "./breadcrumbs";

// instrumentation.md §Navigation: "Captures client-side route
// transitions (SPA)." This is deliberately narrower than that section's
// full scope — it records a *breadcrumb* per route change, not a
// distinct navigation/pageview event (that's tracked separately as its
// own still-open gap in PROGRESS.md's Post-MVP gap closure list; this
// module is a real, useful step toward it, not a silent substitute for
// it).
//
// Framework-independent by design (ADR-005) — this patches the
// standard History API directly rather than depending on any router's
// own events, the same "core stays framework-independent, adapter-
// specific parameterization is later work" reasoning context.ts's route
// field already documents.

let previousPath: string | undefined;

function recordNavigationIfChanged(): void {
	const currentPath = window.location.pathname;
	// Skips the very first call (previousPath is still undefined) — that's
	// page load, not a transition, and skips a no-op state change to the
	// same path (e.g. a hash-only update or a replaceState that doesn't
	// actually move the user anywhere) rather than spamming a breadcrumb
	// for it. instrumentation.md's Navigation section: query strings are
	// never captured — window.location.pathname already excludes them.
	if (previousPath !== undefined && previousPath !== currentPath) {
		recordBreadcrumb("navigation", `Navigation -> ${currentPath}`);
	}
	previousPath = currentPath;
}

export function registerNavigationInstrumentation(): void {
	previousPath = window.location.pathname;

	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);

	window.history.pushState = (
		...args: Parameters<typeof history.pushState>
	) => {
		originalPushState(...args);
		recordNavigationIfChanged();
	};

	window.history.replaceState = (
		...args: Parameters<typeof history.replaceState>
	) => {
		originalReplaceState(...args);
		recordNavigationIfChanged();
	};

	// Back/forward navigation doesn't go through pushState/replaceState at
	// all — popstate is the only signal for it.
	window.addEventListener("popstate", recordNavigationIfChanged);
}

// Test-only reset — same reasoning as breadcrumbs.ts's own
// __resetBreadcrumbsForTests: this module's state is shared across every
// test file in one bun:test process.
export function __resetNavigationForTests(): void {
	previousPath = undefined;
}
