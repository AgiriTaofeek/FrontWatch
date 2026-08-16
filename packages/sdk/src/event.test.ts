import { describe, expect, it } from "bun:test";
import type { Context } from "./context";
import {
	createErrorEvent,
	createNavigationEvent,
	createNetworkEvent,
	createPerformanceEvent,
} from "./event";

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

	it("carries an attached breadcrumb trail through untouched", () => {
		const event = createErrorEvent(
			{
				message: "boom",
				exceptionType: "TypeError",
				handled: true,
				breadcrumbs: [
					{
						category: "navigation",
						message: "Navigation -> /accounts",
						timestamp: "2026-08-16T00:00:00.000Z",
					},
				],
			},
			context,
		);

		if (event.eventType === "error") {
			expect(event.payload.breadcrumbs).toHaveLength(1);
			expect(event.payload.breadcrumbs?.[0]?.category).toBe("navigation");
		}
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

describe("createPerformanceEvent", () => {
	it("builds a performance event with the discriminant set correctly", () => {
		const event = createPerformanceEvent(
			{
				metricName: "LCP",
				value: 1800,
				rating: "good",
				navigationType: "navigate",
			},
			context,
		);

		expect(event.eventType).toBe("performance");
		if (event.eventType === "performance") {
			expect(event.payload.metricName).toBe("LCP");
			expect(event.payload.value).toBe(1800);
			expect(event.payload.rating).toBe("good");
		}
	});
});

describe("createNavigationEvent", () => {
	it("builds a navigation event with the discriminant set correctly", () => {
		const event = createNavigationEvent(
			{ fromRoute: "/accounts", toRoute: "/settings", navigationType: "push" },
			context,
		);

		expect(event.eventType).toBe("navigation");
		if (event.eventType === "navigation") {
			expect(event.payload.fromRoute).toBe("/accounts");
			expect(event.payload.toRoute).toBe("/settings");
			expect(event.payload.navigationType).toBe("push");
		}
	});

	it("allows a null fromRoute for the very first navigation", () => {
		const event = createNavigationEvent(
			{ fromRoute: null, toRoute: "/start", navigationType: "push" },
			context,
		);

		if (event.eventType === "navigation") {
			expect(event.payload.fromRoute).toBeNull();
		}
	});
});
