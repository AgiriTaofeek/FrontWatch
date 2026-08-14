import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { buildContext } from "./context";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SESSION_STORAGE_KEY = "__frontwatch_session__";

beforeEach(() => {
	window.sessionStorage.clear();
});

describe("buildContext session lifecycle", () => {
	it("creates a valid session id on first call", () => {
		const context = buildContext({});
		expect(context.sessionId).toMatch(UUID_RE);
	});

	it("reuses the same session id across calls within the timeout window", () => {
		const first = buildContext({});
		const second = buildContext({});
		expect(second.sessionId).toBe(first.sessionId);
	});

	it("persists the session id in sessionStorage, not just in memory", () => {
		const context = buildContext({});
		const stored = JSON.parse(
			window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}",
		);
		expect(stored.id).toBe(context.sessionId);
	});

	it("extends the session's last-activity timestamp on every call", () => {
		buildContext({});
		const firstStored = JSON.parse(
			window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}",
		);

		// Seed an earlier lastActivityAt directly (avoids a real sleep) to
		// prove the second call actually rewrites it forward, not just
		// leaves the first value untouched.
		window.sessionStorage.setItem(
			SESSION_STORAGE_KEY,
			JSON.stringify({
				id: firstStored.id,
				lastActivityAt: firstStored.lastActivityAt - 1000,
			}),
		);

		buildContext({});
		const secondStored = JSON.parse(
			window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}",
		);

		expect(secondStored.lastActivityAt).toBeGreaterThan(
			firstStored.lastActivityAt - 1000,
		);
	});

	it("starts a new session once the inactivity timeout has elapsed", () => {
		const staleSessionId = "11111111-1111-1111-1111-111111111111";
		const THIRTY_ONE_MINUTES_MS = 31 * 60 * 1000;
		window.sessionStorage.setItem(
			SESSION_STORAGE_KEY,
			JSON.stringify({
				id: staleSessionId,
				lastActivityAt: Date.now() - THIRTY_ONE_MINUTES_MS,
			}),
		);

		const context = buildContext({});

		expect(context.sessionId).not.toBe(staleSessionId);
		expect(context.sessionId).toMatch(UUID_RE);
	});

	it("keeps the same session just under the inactivity timeout", () => {
		const recentSessionId = "22222222-2222-2222-2222-222222222222";
		const TWENTY_NINE_MINUTES_MS = 29 * 60 * 1000;
		window.sessionStorage.setItem(
			SESSION_STORAGE_KEY,
			JSON.stringify({
				id: recentSessionId,
				lastActivityAt: Date.now() - TWENTY_NINE_MINUTES_MS,
			}),
		);

		const context = buildContext({});

		expect(context.sessionId).toBe(recentSessionId);
	});

	it("recovers from a corrupted stored session instead of crashing", () => {
		window.sessionStorage.setItem(SESSION_STORAGE_KEY, "not valid json");

		const context = buildContext({});

		expect(context.sessionId).toMatch(UUID_RE);
	});

	describe("without sessionStorage available", () => {
		let originalSessionStorage: Storage;

		beforeEach(() => {
			originalSessionStorage = window.sessionStorage;
			// happy-dom's sessionStorage is a normal accessor property here,
			// so this simulates a browser where storage access itself throws
			// (some privacy modes do this) without deleting the global.
			Object.defineProperty(window, "sessionStorage", {
				configurable: true,
				get() {
					throw new Error("storage disabled");
				},
			});
		});

		afterEach(() => {
			Object.defineProperty(window, "sessionStorage", {
				configurable: true,
				value: originalSessionStorage,
			});
		});

		it("still produces a usable session id, never throws", () => {
			expect(() => buildContext({})).not.toThrow();
			const context = buildContext({});
			expect(context.sessionId).toMatch(UUID_RE);
		});

		it("keeps the same id across calls via the in-memory fallback", () => {
			const first = buildContext({});
			const second = buildContext({});
			expect(second.sessionId).toBe(first.sessionId);
		});
	});
});
