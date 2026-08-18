import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { render, screen } from "@testing-library/react";

// mock.module replaces "@frontwatch/sdk" in the shared module registry
// for the whole test run — useFrontwatchInit.test.tsx also imports from
// it, so this mock's shape has to stay complete (every export this
// package actually uses stubbed), same lesson packages/sdk's own tests
// already learned the hard way (errors.test.ts's comment).
// Explicitly typed parameters — an untyped mock(() => {}) makes
// .mock.calls infer as [][] (empty tuples), silently typing every
// call?.[n] below as unreachable. Same gotcha PROGRESS.md's Step 7 entry
// already documents for packages/sdk's own tests.
const captureExceptionMock = mock((_error: Error, _handled?: boolean) => {});
const addBreadcrumbMock = mock(
	(_message: string, _data?: Record<string, unknown>) => {},
);
mock.module("@frontwatch/sdk", () => ({
	captureException: captureExceptionMock,
	addBreadcrumb: addBreadcrumbMock,
	init: mock(() => {}),
}));

const { FrontwatchErrorBoundary } = await import("./ErrorBoundary");

function Bomb(): never {
	throw new Error("boom");
}

describe("FrontwatchErrorBoundary", () => {
	let consoleErrorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		captureExceptionMock.mockClear();
		addBreadcrumbMock.mockClear();
		// React logs a caught error boundary error to console.error itself
		// (dev-mode behavior) — expected noise for these tests, not a
		// signal to assert on, so it's suppressed rather than left to spam
		// the real test output.
		consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it("renders children normally when nothing throws", () => {
		render(
			<FrontwatchErrorBoundary>
				<p>all good</p>
			</FrontwatchErrorBoundary>,
		);
		expect(screen.getByText("all good")).toBeDefined();
	});

	it("captures a render error as unhandled, not just swallows it", () => {
		render(
			<FrontwatchErrorBoundary>
				<Bomb />
			</FrontwatchErrorBoundary>,
		);
		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
		const [error, handled] = captureExceptionMock.mock.calls[0];
		expect(error.message).toBe("boom");
		expect(handled).toBe(false);
	});

	it("records a breadcrumb with the component stack before capturing", () => {
		render(
			<FrontwatchErrorBoundary>
				<Bomb />
			</FrontwatchErrorBoundary>,
		);
		expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
		const [message, data] = addBreadcrumbMock.mock.calls[0];
		expect(message).toBe(
			"React component tree error caught by FrontwatchErrorBoundary",
		);
		expect(data?.componentStack).toContain("Bomb");
	});

	it("renders nothing after an error when no fallback is given", () => {
		const { container } = render(
			<FrontwatchErrorBoundary>
				<Bomb />
			</FrontwatchErrorBoundary>,
		);
		expect(container.textContent).toBe("");
	});

	it("renders a static fallback after an error", () => {
		render(
			<FrontwatchErrorBoundary fallback={<p>something went wrong</p>}>
				<Bomb />
			</FrontwatchErrorBoundary>,
		);
		expect(screen.getByText("something went wrong")).toBeDefined();
	});

	it("renders a function fallback with the caught error", () => {
		render(
			<FrontwatchErrorBoundary
				fallback={(error) => <p>failed: {error.message}</p>}
			>
				<Bomb />
			</FrontwatchErrorBoundary>,
		);
		expect(screen.getByText("failed: boom")).toBeDefined();
	});
});
