import { describe, expect, it, mock } from "bun:test";

const captureExceptionMock = mock(() => {});

// mock.module replaces "./client" in the shared module registry for the
// whole test run, not just this file — network.test.ts/
// performance.test.ts also import from "./client", so this mock's shape
// has to be complete (every export stubbed), or a run that executes
// this file first breaks the others with a real "export not found"
// error. Found by running the full suite, not this file alone.
mock.module("./client", () => ({
	captureException: captureExceptionMock,
	captureNetworkEvent: mock(() => {}),
	capturePerformanceEvent: mock(() => {}),
	captureNavigationEvent: mock(() => {}),
	init: mock(() => {}),
}));

const { registerErrorInstrumentation } = await import("./errors");

describe("registerErrorInstrumentation", () => {
	it("captures an uncaught synchronous error via the global error event", () => {
		registerErrorInstrumentation();

		const error = new Error("boom");
		window.dispatchEvent(
			new ErrorEvent("error", { error, message: error.message }),
		);

		expect(captureExceptionMock).toHaveBeenCalledWith(error, false);
	});

	it("ignores error events with no .error (resource-load failures, cross-origin scripts)", () => {
		captureExceptionMock.mockClear();
		registerErrorInstrumentation();

		window.dispatchEvent(new ErrorEvent("error", { message: "Script error." }));

		expect(captureExceptionMock).not.toHaveBeenCalled();
	});

	it("captures an unhandled promise rejection", () => {
		captureExceptionMock.mockClear();
		registerErrorInstrumentation();

		const reason = new Error("rejected");
		const event = new Event("unhandledrejection") as PromiseRejectionEvent & {
			reason: unknown;
		};
		Object.defineProperty(event, "reason", { value: reason });
		window.dispatchEvent(event);

		expect(captureExceptionMock).toHaveBeenCalledWith(reason, false);
	});
});
