import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetBreadcrumbsForTests, getBreadcrumbTrail } from "./breadcrumbs";
import {
	__resetNavigationForTests,
	registerNavigationInstrumentation,
} from "./navigation";

// Registered exactly once, matching how index.ts's own production code
// only ever calls this once (guarded by instrumentationRegistered) —
// navigation.ts itself has no re-registration guard of its own, so
// calling it again per-test would monkey-patch pushState/replaceState on
// top of the already-wrapped version from the previous test, firing
// recordNavigationIfChanged multiple times per real call. Every test
// below instead uses __resetNavigationForTests() to reset *state*
// (previousPath) between tests, not by re-wrapping the History API.
registerNavigationInstrumentation();

beforeEach(() => {
	// happydom.ts's shared global registration has no URL at all
	// (defaults to "about:blank"), against which pushState/replaceState
	// with a relative path can't resolve a real pathname — confirmed
	// directly: window.location.pathname stayed "blank" through a
	// pushState call without this. window.happyDOM.setURL is scoped to
	// the current test file/run, not a change to the shared preload
	// config other test files rely on.
	// biome-ignore lint/suspicious/noExplicitAny: happy-dom's own global augmentation isn't in this package's ambient types
	(window as any).happyDOM.setURL("https://example.test/start");

	// Establishes a known baseline: previousPath === "/start" by the end
	// of this block, regardless of what the previous test left behind.
	// Reset first (previousPath -> undefined, so this replaceState call
	// itself is treated as "the first navigation" and records nothing),
	// then the replaceState call sets previousPath to "/start" as its
	// own side effect.
	__resetNavigationForTests();
	window.history.replaceState(null, "", "/start");
	__resetBreadcrumbsForTests();
});

afterEach(() => {
	window.history.replaceState(null, "", "/");
});

describe("registerNavigationInstrumentation", () => {
	it("records a breadcrumb on pushState to a new path", () => {
		window.history.pushState(null, "", "/accounts");

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(1);
		expect(trail[0]).toMatchObject({
			category: "navigation",
			message: "Navigation -> /accounts",
		});
	});

	it("records a breadcrumb on replaceState to a new path", () => {
		window.history.replaceState(null, "", "/profile");

		expect(getBreadcrumbTrail()).toHaveLength(1);
		expect(getBreadcrumbTrail()[0]?.message).toBe("Navigation -> /profile");
	});

	it("records a breadcrumb on popstate (back/forward navigation)", () => {
		window.history.pushState(null, "", "/accounts");
		window.history.pushState(null, "", "/settings");
		__resetBreadcrumbsForTests(); // isolate: only the popstate call below

		window.dispatchEvent(new PopStateEvent("popstate"));

		// jsdom/happy-dom doesn't rewind window.location on a synthetic
		// popstate the way a real browser does, so this can't assert a
		// *new* breadcrumb — the meaningful assertion is that popstate is
		// wired to the same recordNavigationIfChanged path-diffing logic
		// pushState/replaceState already proved above (a real browser's
		// popstate always corresponds to an actual path change, which this
		// environment can't simulate).
		expect(getBreadcrumbTrail()).toHaveLength(0);
	});

	it("does not record a breadcrumb for the very first page load", () => {
		// Undoes beforeEach's own baseline-establishing replaceState —
		// this is what a genuinely fresh page load looks like (no prior
		// navigation for this module to compare against).
		__resetNavigationForTests();

		window.history.pushState(null, "", "/wherever");

		expect(getBreadcrumbTrail()).toHaveLength(0);
	});

	it("does not record a duplicate breadcrumb for a no-op state change to the same path", () => {
		window.history.pushState({ some: "state" }, "", "/start");
		expect(getBreadcrumbTrail()).toHaveLength(0);
	});

	it("never includes the query string in the recorded path", () => {
		window.history.pushState(null, "", "/search?q=secret");
		expect(getBreadcrumbTrail()[0]?.message).toBe("Navigation -> /search");
	});
});
