import { describe, expect, it } from "bun:test";
import type { Context } from "./context";
import { createErrorEvent, createNetworkEvent } from "./event";

const context: Context = { sessionId: "sess_1" };

describe("createErrorEvent", () => {
	it("builds an error event with a generated id and current timestamp", () => {
		const event = createErrorEvent(
			{ message: "boom", exceptionType: "TypeError", handled: true },
			context,
		);

		expect(event.eventType).toBe("error");
		expect(event.eventId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
		expect(event.schemaVersion).toBe(1);
		expect(new Date(event.clientTimestamp).toString()).not.toBe("Invalid Date");
		expect(event.context).toBe(context);
		if (event.eventType === "error") {
			expect(event.payload.message).toBe("boom");
		}
	});

	it("generates a different id on each call", () => {
		const a = createErrorEvent(
			{ message: "a", exceptionType: "Error", handled: true },
			context,
		);
		const b = createErrorEvent(
			{ message: "b", exceptionType: "Error", handled: true },
			context,
		);
		expect(a.eventId).not.toBe(b.eventId);
	});
});

describe("createNetworkEvent", () => {
	it("builds a network event with the discriminant set correctly", () => {
		const event = createNetworkEvent(
			{
				method: "GET",
				resource: "/api/users/:id",
				status: 200,
				durationMs: 42,
				outcome: "success",
			},
			context,
		);

		expect(event.eventType).toBe("network");
		if (event.eventType === "network") {
			expect(event.payload.resource).toBe("/api/users/:id");
			expect(event.payload.outcome).toBe("success");
		}
	});
});
