import { describe, expect, it, mock } from "bun:test";

const captureExceptionMock = mock(() => {});

mock.module("./client", () => ({
	captureException: captureExceptionMock,
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
