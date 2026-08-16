import { captureException } from "./client";

// Automatic capture — both handlers are thin wrappers over
// captureException, the same code path manual capture uses. No separate
// implementation to drift between the two.
//
// Deferred, not forgotten: resource-loading failures (broken <script>/
// <img>) also fire the "error" event per instrumentation.md, but need a
// different payload shape (which resource, not an exception message/
// stack) — out of scope for this pass, this only handles real script
// errors and unhandled promise rejections.
// instrumentation.md: "The browser SDK must never accidentally execute
// browser-specific privacy/instrumentation logic during SSR." A real,
// previously-uncaught gap: calling init() (which calls this) in any
// non-browser context (SSR, a Node test runner, a build script that
// accidentally pulls this in) threw immediately on the first `window`
// access — confirmed directly, not assumed, with a throwaway Bun script
// outside any browser-shimmed environment. Every register* function in
// this package gets the identical guard, not just this one.
export function registerErrorInstrumentation(): void {
	if (typeof window === "undefined") {
		return;
	}
	window.addEventListener("error", (event) => {
		// event.error is undefined for resource-load failures and for
		// cross-origin scripts without CORS headers ("Script error." with
		// no usable detail) — nothing useful to capture in either case.
		if (event.error) {
			captureException(event.error, false);
		}
	});

	window.addEventListener("unhandledrejection", (event) => {
		// event.reason can be anything — a rejected Promise isn't required
		// to reject with an Error. captureException's fallback (String())
		// already handles the non-Error case.
		captureException(event.reason, false);
	});
}
