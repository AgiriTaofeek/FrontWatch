import { afterEach, describe, expect, it } from "bun:test";
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

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalHistory = globalThis.history;

// Reproducing a genuine non-browser environment requires each property
// to be *absent*, not merely undefined — `typeof window` on a deleted
// global is "undefined", the exact condition each guard checks for.
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

afterEach(() => {
	restoreBrowserGlobals();
});

describe("register* instrumentation — SSR safety", () => {
	it("registerErrorInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		expect(() => registerErrorInstrumentation()).not.toThrow();
	});

	it("registerNetworkInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		expect(() =>
			registerNetworkInstrumentation({ ignoreUrlPrefix: "http://x" }),
		).not.toThrow();
	});

	it("registerNavigationInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		expect(() => registerNavigationInstrumentation()).not.toThrow();
	});

	it("registerInteractionInstrumentation never throws when document is undefined", () => {
		removeBrowserGlobals();
		expect(() => registerInteractionInstrumentation()).not.toThrow();
	});

	it("registerPerformanceInstrumentation never throws when window is undefined", () => {
		removeBrowserGlobals();
		expect(() => registerPerformanceInstrumentation()).not.toThrow();
	});
});
