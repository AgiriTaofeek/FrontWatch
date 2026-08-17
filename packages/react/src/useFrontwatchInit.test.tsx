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

// Same complete-shape requirement as ErrorBoundary.test.tsx's mock of
// "@frontwatch/sdk" — both files share the module registry.
const initMock = mock(
	(_options: { publicKey: string; endpoint: string }) => {},
);
const captureExceptionMock = mock((_error: Error, _handled?: boolean) => {});
mock.module("@frontwatch/sdk", () => ({
	captureException: captureExceptionMock,
	addBreadcrumb: mock(() => {}),
	init: initMock,
}));

const { useFrontwatchInit } = await import("./useFrontwatchInit");
const { FrontwatchErrorBoundary } = await import("./ErrorBoundary");

function Harness({ publicKey }: { publicKey: string }) {
	useFrontwatchInit({ publicKey, endpoint: "http://localhost:8080" });
	return <p>rendered</p>;
}

function Bomb(): never {
	throw new Error("boom on mount");
}

describe("useFrontwatchInit", () => {
	let consoleErrorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		initMock.mockClear();
		captureExceptionMock.mockClear();
		// React logs Bomb's error to console.error itself (dev-mode
		// behavior) in the regression test below — expected noise, not a
		// signal to assert on.
		consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it("calls init() during render, not deferred to after mount", () => {
		render(<Harness publicKey="fw_pk_test" />);
		expect(initMock).toHaveBeenCalledTimes(1);
		expect(initMock).toHaveBeenCalledWith({
			publicKey: "fw_pk_test",
			endpoint: "http://localhost:8080",
		});
	});

	it("calls init() again on every re-render, relying on init()'s own idempotency, not the hook's", () => {
		// The hook itself does no gating — client.ts's real init() is what's
		// idempotent (a second call is a no-op returning the existing
		// client). This mock is a dumb stub, so it faithfully shows every
		// call the hook actually makes; the real init() absorbing repeat
		// calls cheaply is proven in packages/sdk's own test suite, not
		// re-tested here.
		const { rerender } = render(<Harness publicKey="fw_pk_test" />);
		expect(initMock).toHaveBeenCalledTimes(1);

		rerender(<Harness publicKey="fw_pk_test" />);
		expect(initMock).toHaveBeenCalledTimes(2);
	});

	it("never calls init() during a server render", async () => {
		// happy-dom's global registration (bunfig.toml's preload) makes
		// window/document present for every other test in this file, which
		// would make renderToString below behave like a browser regardless
		// of whether this hook is actually SSR-safe — same technique
		// packages/sdk's own ssr-safety.test.ts already established: delete
		// the globals for this one scoped test, restore immediately after.
		const savedWindow = globalThis.window;
		const savedDocument = globalThis.document;
		delete (globalThis as { window?: unknown }).window;
		delete (globalThis as { document?: unknown }).document;

		try {
			const { renderToString } = await import("react-dom/server");
			renderToString(<Harness publicKey="fw_pk_test" />);
			expect(initMock).not.toHaveBeenCalled();
		} finally {
			globalThis.window = savedWindow;
			globalThis.document = savedDocument;
		}
	});

	it("regression: init() runs before a sibling that throws on the very first render, so its error is actually captured", () => {
		// The real bug this hook's original useEffect-based version had:
		// componentDidCatch fires during the synchronous commit phase,
		// strictly before any passive effect — so an effect-based init()
		// call hadn't run yet by the time a first-render error reached the
		// boundary, and captureException() silently no-op'd on "no client
		// yet." Calling init() directly in the render body fixes this
		// because rendering is top-down: Harness's own body (which calls
		// this hook) always runs before React attempts to render Bomb.
		function App() {
			useFrontwatchInit({
				publicKey: "fw_pk_test",
				endpoint: "http://localhost:8080",
			});
			return (
				<FrontwatchErrorBoundary fallback={<p>caught</p>}>
					<Bomb />
				</FrontwatchErrorBoundary>
			);
		}

		render(<App />);

		// Not asserting an exact call count for initMock: React's dev-mode
		// error recovery re-invokes a failing render pass an extra time to
		// produce a better component stack for its own error reporting
		// (confirmed empirically — 3 calls here, not 1, unrelated to this
		// hook's own logic), so App's body — and therefore this hook —
		// legitimately runs more than once around a single real error. The
		// actual regression being guarded against is captureException()
		// getting silently dropped, not a specific render count.
		expect(initMock.mock.calls.length).toBeGreaterThanOrEqual(1);
		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
		expect(screen.getByText("caught")).toBeDefined();
	});
});
