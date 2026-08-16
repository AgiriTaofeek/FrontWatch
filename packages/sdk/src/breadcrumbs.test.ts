import { afterEach, describe, expect, it } from "bun:test";
import {
	__resetBreadcrumbsForTests,
	addBreadcrumb,
	getBreadcrumbTrail,
	recordBreadcrumb,
} from "./breadcrumbs";

afterEach(() => {
	__resetBreadcrumbsForTests();
});

describe("recordBreadcrumb / getBreadcrumbTrail", () => {
	it("records a breadcrumb with the given category, message, and data", () => {
		recordBreadcrumb("navigation", "Navigation -> /accounts", { foo: "bar" });

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(1);
		expect(trail[0]).toMatchObject({
			category: "navigation",
			message: "Navigation -> /accounts",
			data: { foo: "bar" },
		});
		expect(typeof trail[0]?.timestamp).toBe("string");
	});

	it("keeps breadcrumbs in the order they were recorded", () => {
		recordBreadcrumb("navigation", "first");
		recordBreadcrumb("network", "second");
		recordBreadcrumb("error", "third");

		const trail = getBreadcrumbTrail();
		expect(trail.map((b) => b.message)).toEqual(["first", "second", "third"]);
	});

	it("bounds the trail to the last 50 entries, dropping the oldest first", () => {
		for (let i = 0; i < 55; i++) {
			recordBreadcrumb("custom", `entry ${i}`);
		}

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(50);
		// The first 5 (0-4) should have been dropped — the trail starts at
		// entry 5, not entry 0.
		expect(trail[0]?.message).toBe("entry 5");
		expect(trail[49]?.message).toBe("entry 54");
	});

	it("returns a copy, not the live internal array", () => {
		recordBreadcrumb("custom", "one");
		const trail = getBreadcrumbTrail();
		trail.push({
			category: "custom",
			message: "mutated in by the caller",
			timestamp: new Date().toISOString(),
		});

		// The mutation above must not have reached the internal buffer —
		// a second call still reflects only what was actually recorded.
		expect(getBreadcrumbTrail()).toHaveLength(1);
	});
});

describe("addBreadcrumb", () => {
	it("always records category 'custom', regardless of what a caller might pass", () => {
		addBreadcrumb("developer note", { detail: 42 });

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(1);
		expect(trail[0]).toMatchObject({
			category: "custom",
			message: "developer note",
			data: { detail: 42 },
		});
	});

	it("works with no data argument at all", () => {
		addBreadcrumb("just a message");
		expect(getBreadcrumbTrail()[0]?.data).toBeUndefined();
	});
});
