import { afterEach, describe, expect, it, mock } from "bun:test";
import type { FrontwatchEvent } from "./event";
import { Transport } from "./transport";

const fakeEvent: FrontwatchEvent = {
	eventId: "e1",
	schemaVersion: 1,
	eventType: "error",
	clientTimestamp: new Date().toISOString(),
	context: { sessionId: "test-session" },
	payload: { message: "boom", exceptionType: "Error", handled: true },
};

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("Transport", () => {
	it("sends nothing when there are no events", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({ endpoint: "http://x", publicKey: "k" });
		await transport.send([]);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not retry on success", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(new Response(null, { status: 200 })),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			baseDelayMs: 1,
		});
		await transport.send([fakeEvent]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not retry on a 4xx (permanent rejection)", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(new Response(null, { status: 401 })),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			baseDelayMs: 1,
		});
		await transport.send([fakeEvent]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("retries on a 5xx and succeeds once the server recovers", async () => {
		let calls = 0;
		const fetchMock = mock(() => {
			calls++;
			return Promise.resolve(
				new Response(null, { status: calls < 3 ? 503 : 200 }),
			);
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			baseDelayMs: 1,
		});
		await transport.send([fakeEvent]);

		expect(calls).toBe(3);
	});

	it("gives up after maxRetries and does not retry forever", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(new Response(null, { status: 503 })),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			maxRetries: 2,
			baseDelayMs: 1,
		});
		await transport.send([fakeEvent]);

		// 1 initial attempt + 2 retries = 3 total calls, then stop.
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("treats a network failure (fetch throws) as retryable", async () => {
		let calls = 0;
		const fetchMock = mock(() => {
			calls++;
			if (calls === 1) {
				return Promise.reject(new Error("network down"));
			}
			return Promise.resolve(new Response(null, { status: 200 }));
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			baseDelayMs: 1,
		});
		await transport.send([fakeEvent]);

		expect(calls).toBe(2);
	});

	// Failure recovery (PROGRESS.md's Step 9 entry): ADR-006's "SDK must
	// fail open" and legacy-docs/17-testing-and-quality/failure-testing.md's
	// explicit requirement ("FrontWatch unavailable" must not become an
	// application outage) were only ever exercised here via fetch calls
	// that eventually succeed or a status that persists — never the case
	// where FrontWatch is unreachable for the *entire* retry budget, i.e.
	// a real, sustained outage. This is the one that matters most: proof
	// that send()'s promise resolves cleanly (never rejects, never
	// throws) even when every single attempt fails at the network level,
	// not just when a status code persists.
	it("resolves cleanly (never throws) when every attempt is a network failure — a sustained outage, not a transient one", async () => {
		const fetchMock = mock(() => Promise.reject(new Error("network down")));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const transport = new Transport({
			endpoint: "http://x",
			publicKey: "k",
			maxRetries: 2,
			baseDelayMs: 1,
		});

		await expect(transport.send([fakeEvent])).resolves.toBeUndefined();
		// 1 initial attempt + 2 retries = 3 total calls, then a clean,
		// silent give-up — never an unhandled rejection reaching the host
		// application's own error handling.
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
