import { describe, expect, it } from "bun:test";
import { registerErrorInstrumentation } from "./errors";
import { registerInteractionInstrumentation } from "./interactions";
import { registerNavigationInstrumentation } from "./navigation";
import { registerNetworkInstrumentation } from "./network";
import { registerPerformanceInstrumentation } from "./performance";

// instrumentation.md: "The browser SDK must never accidentally execute
// browser-specific privacy/instrumentation logic during SSR." A real
// gap found while scoping the framework-adapter work (PROGRESS.md):
// every register* function below threw immediately (confirmed with a
// throwaway script run outside any browser-shimmed environment, not
// assumed) the moment it touched `window`/`document`. Fixed with an
// early-return guard in each — this file is the permanent regression
// test for that fix.
//
// happydom.ts's shared preload means `window`/`document` are globally
// present for every other test in this package's suite — the only way
// to actually exercise "these are undefined" here is to delete them
// from globalThis for the scope of one test and restore them
// immediately after, not skip coverage because the ambient environment
// makes it inconvenient.
//
// Restore is a synchronous try/finally *inside* each test, not a
// shared afterEach — found the hard way (real, intermittent failures
// while working on an unrelated change: dozens of unrelated tests
// across other files started failing with "window is not defined").
// bun:test wraps every test body in its own internal promise handling
// even for a fully synchronous test, which is enough of a scheduling
// gap for another file's test to observe these globals mid-deletion if
// bun interleaves file execution — afterEach fires after that gap, a
// same-body try/finally does not leave one at all.
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalHistory = globalThis.history;

function removeBrowserGlobals(): void {
	delete (globalThis as { window?: unknown }).window;
	delete (globalThis as { document?: unknown }).document;
	delete (globalThis as { navigator?: unknown }).navigator;
	delete (globalThis as { history?: unknown }).history;
}

function restoreBrowserGlobals(): void {
	globalThis.window = originalWindow;
	globalThis.document = originalDocument;
	globalThis.navigator = originalNavigator;
	globalThis.history = originalHistory;
}

describe("register* instrumentation — SSR safety", () => {
	it("registerErrorInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		try {
			expect(() => registerErrorInstrumentation()).not.toThrow();
		} finally {
			restoreBrowserGlobals();
		}
	});

	it("registerNetworkInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		try {
			expect(() =>
				registerNetworkInstrumentation({ ignoreUrlPrefix: "http://x" }),
			).not.toThrow();
		} finally {
			restoreBrowserGlobals();
		}
	});

	it("registerNavigationInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		try {
			expect(() => registerNavigationInstrumentation()).not.toThrow();
		} finally {
			restoreBrowserGlobals();
		}
	});

	it("registerInteractionInstrumentation never throws when document is undefined", () => {
		removeBrowserGlobals();
		try {
			expect(() => registerInteractionInstrumentation()).not.toThrow();
		} finally {
			restoreBrowserGlobals();
		}
	});

	it("registerPerformanceInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		try {
			expect(() => registerPerformanceInstrumentation()).not.toThrow();
		} finally {
			restoreBrowserGlobals();
		}
	});
});
