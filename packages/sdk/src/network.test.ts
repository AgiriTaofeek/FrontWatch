import { afterEach, describe, expect, it, mock } from "bun:test";
import { __resetBreadcrumbsForTests, getBreadcrumbTrail } from "./breadcrumbs";
import type { NetworkPayload } from "./event";

// Typed as (payload: NetworkPayload) => void, not the untyped () => {}
// this started as — an untyped mock's `.mock.calls` infers as `[][]`
// (empty tuples), which silently made every `call?.[0]` below type as
// `never`. Only surfaced once this package actually resolved
// @types/bun and got real `tsc --noEmit` coverage (see PROGRESS.md) —
// `bun test`'s runtime never type-checks at all.
const captureNetworkEventMock = mock((_payload: NetworkPayload) => {});

// Same reasoning as errors.test.ts's mock: complete shape, since
// mock.module replaces "./client" in the shared registry for the
// whole test run, not just this file.
mock.module("./client", () => ({
	captureException: mock(() => {}),
	captureNetworkEvent: captureNetworkEventMock,
	capturePerformanceEvent: mock(() => {}),
}));

const { normalizeResource, registerNetworkInstrumentation } = await import(
	"./network"
);

// network.ts imports the real (unmocked) "./breadcrumbs" — its module-
// level trail is shared across every test file in this bun:test
// process, same as breadcrumbs.test.ts/navigation.test.ts/
// interactions.test.ts already have to account for. Reset after every
// test here too, so this file never leaks recorded breadcrumbs into
// whichever file happens to run next.
afterEach(() => {
	__resetBreadcrumbsForTests();
});

describe("normalizeResource", () => {
	it("replaces numeric path segments with :id", () => {
		expect(normalizeResource("/api/users/123", "http://x")).toBe(
			"/api/users/:id",
		);
	});

	it("replaces UUID path segments with :id", () => {
		expect(
			normalizeResource(
				"/api/sessions/550e8400-e29b-41d4-a716-446655440000",
				"http://x",
			),
		).toBe("/api/sessions/:id");
	});

	it("drops the query string entirely", () => {
		expect(normalizeResource("/search?q=secret", "http://x")).toBe("/search");
	});

	it("leaves plain path segments alone", () => {
		expect(normalizeResource("/api/users/me", "http://x")).toBe(
			"/api/users/me",
		);
	});
});

describe("registerNetworkInstrumentation", () => {
	it("captures a successful request", async () => {
		captureNetworkEventMock.mockClear();
		const originalFetch = mock(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);
		window.fetch = originalFetch as unknown as typeof fetch;

		registerNetworkInstrumentation({ ignoreUrlPrefix: "http://ingest" });
		await window.fetch("http://api.example.com/users/123");

		expect(captureNetworkEventMock).toHaveBeenCalledTimes(1);
		const [call] = captureNetworkEventMock.mock.calls;
		expect(call?.[0]).toMatchObject({
			method: "GET",
			resource: "/users/:id",
			status: 200,
			outcome: "success",
		});

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(1);
		expect(trail[0]).toMatchObject({
			category: "network",
			message: "GET /users/:id -> 200",
		});
	});

	it("captures a failed (non-2xx) response as outcome failure", async () => {
		captureNetworkEventMock.mockClear();
		window.fetch = mock(() =>
			Promise.resolve(new Response(null, { status: 500 })),
		) as unknown as typeof fetch;

		registerNetworkInstrumentation({ ignoreUrlPrefix: "http://ingest" });
		await window.fetch("http://api.example.com/orders");

		const [call] = captureNetworkEventMock.mock.calls;
		expect(call?.[0]).toMatchObject({ status: 500, outcome: "failure" });
		expect(getBreadcrumbTrail()[0]?.message).toBe("GET /orders -> 500");
	});

	it("captures a network failure and still rethrows it (never swallows)", async () => {
		captureNetworkEventMock.mockClear();
		const networkError = new Error("network down");
		window.fetch = mock(() =>
			Promise.reject(networkError),
		) as unknown as typeof fetch;

		registerNetworkInstrumentation({ ignoreUrlPrefix: "http://ingest" });

		await expect(window.fetch("http://api.example.com/orders")).rejects.toThrow(
			"network down",
		);

		const [call] = captureNetworkEventMock.mock.calls;
		expect(call?.[0]).toMatchObject({ status: 0, outcome: "failure" });
		expect(getBreadcrumbTrail()[0]?.message).toBe("GET /orders -> failed");
	});

	it("passes through requests to the ignored URL prefix without capturing", async () => {
		captureNetworkEventMock.mockClear();
		const originalFetch = mock(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);
		window.fetch = originalFetch as unknown as typeof fetch;

		registerNetworkInstrumentation({
			ignoreUrlPrefix: "http://ingest.example.com",
		});
		await window.fetch("http://ingest.example.com/ingest/v1/events");

		expect(captureNetworkEventMock).not.toHaveBeenCalled();
		expect(originalFetch).toHaveBeenCalledTimes(1);
		expect(getBreadcrumbTrail()).toHaveLength(0);
	});
});
