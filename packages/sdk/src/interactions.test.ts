import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetBreadcrumbsForTests, getBreadcrumbTrail } from "./breadcrumbs";
import { registerInteractionInstrumentation } from "./interactions";

// Registered once (module-level, like navigation.test.ts) — this
// module's own click listener has no re-registration guard, matching
// how index.ts's production code only ever calls it once.
registerInteractionInstrumentation();

// Reset both before *and* after — breadcrumbs.ts's trail is a shared,
// process-wide singleton (bun:test runs every file in one process).
// After-only reset was confirmed (in CI, not locally — file execution
// order differs) to leave this file's first test inheriting whatever
// residue the previous file's own tests left behind.
beforeEach(() => {
	__resetBreadcrumbsForTests();
});
afterEach(() => {
	__resetBreadcrumbsForTests();
	document.body.innerHTML = "";
});

function click(element: Element): void {
	element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("registerInteractionInstrumentation", () => {
	it("records tag + id for a clicked element with an id", () => {
		const button = document.createElement("button");
		button.id = "submit-transfer";
		document.body.appendChild(button);

		click(button);

		const trail = getBreadcrumbTrail();
		expect(trail).toHaveLength(1);
		expect(trail[0]).toMatchObject({
			category: "interaction",
			message: "Click -> button#submit-transfer",
		});
	});

	it("records tag + first class when there's no id", () => {
		const link = document.createElement("a");
		link.className = "nav-link secondary";
		document.body.appendChild(link);

		click(link);

		expect(getBreadcrumbTrail()[0]?.message).toBe("Click -> a.nav-link");
	});

	it("records just the tag name when there's no id or class", () => {
		const div = document.createElement("div");
		document.body.appendChild(div);

		click(div);

		expect(getBreadcrumbTrail()[0]?.message).toBe("Click -> div");
	});

	it("never captures the element's text content, even when it's set", () => {
		const button = document.createElement("button");
		button.id = "pay";
		button.textContent = "Pay $4,500.00 to Jane Doe";
		document.body.appendChild(button);

		click(button);

		const message = getBreadcrumbTrail()[0]?.message ?? "";
		expect(message).not.toContain("Pay");
		expect(message).not.toContain("Jane Doe");
		expect(message).toBe("Click -> button#pay");
	});

	it("captures a click on a nested child by its own tag, not the ancestor's", () => {
		const container = document.createElement("div");
		container.id = "toolbar";
		const icon = document.createElement("span");
		icon.className = "icon-save";
		container.appendChild(icon);
		document.body.appendChild(container);

		click(icon);

		expect(getBreadcrumbTrail()[0]?.message).toBe("Click -> span.icon-save");
	});
});
