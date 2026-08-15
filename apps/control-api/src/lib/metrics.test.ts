import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { metricsPlugin } from "./metrics";

// metricsPlugin registers its counters/histogram on prom-client's
// default (module-level) registry at import time — every test in this
// file shares that one registry, same as the real app does, so
// assertions check that a specific route's counter is *at least* what
// this test itself caused, not an exact total (another test file
// importing this module in the same bun test run would add to the
// same counters).
describe("metricsPlugin", () => {
	it("exposes /metrics in Prometheus text format, including the default process metrics", async () => {
		const app = new Elysia().use(metricsPlugin());

		const response = await app.handle(new Request("http://localhost/metrics"));
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/plain");
		// collectDefaultMetrics() — confirms it's actually wired up, not
		// just the two HTTP metrics this plugin defines itself.
		expect(body).toContain("process_cpu_user_seconds_total");
	});

	it("records a request count + duration observation for a route mounted alongside it, labeled by route pattern (not the resolved path)", async () => {
		const app = new Elysia()
			.use(metricsPlugin())
			.get("/widgets/:id", () => "ok");

		await app.handle(new Request("http://localhost/widgets/abc123"));

		const metricsResponse = await app.handle(
			new Request("http://localhost/metrics"),
		);
		const body = await metricsResponse.text();

		// Label ordering in prom-client's text output isn't something to
		// couple this test to — check each label=value pair is present on
		// a control_api_http_requests_total line, not one exact string.
		const requestsLine = body
			.split("\n")
			.find(
				(line) =>
					line.startsWith("control_api_http_requests_total") &&
					line.includes('route="/widgets/:id"'),
			);

		expect(requestsLine).toBeDefined();
		expect(requestsLine).toContain('method="GET"');
		expect(requestsLine).toContain('status="200"');
		// The real resolved path (with the actual id) must never appear
		// as a label value — operations.md's high-cardinality caution.
		expect(body).not.toContain("/widgets/abc123");

		const durationCountLine = body
			.split("\n")
			.find(
				(line) =>
					line.startsWith("control_api_http_request_duration_seconds_count") &&
					line.includes('route="/widgets/:id"'),
			);
		expect(durationCountLine).toBeDefined();
	});

	it("records a validation-failure response too, via onError (not just the success path)", async () => {
		// Regression test: a first version of this plugin used
		// onAfterResponse alone, which turned out (confirmed empirically)
		// to fire *after* .handle()'s returned promise already resolves —
		// a real race for anything scraping /metrics right after
		// triggering traffic. Switching to onAfterHandle fixed the
		// timing, but onAfterHandle never runs for a thrown/validation
		// error at all (confirmed empirically too) — it goes straight to
		// onError instead. This test exercises exactly that path.
		const app = new Elysia()
			.use(metricsPlugin())
			.post("/gadgets", () => "ok", { body: t.Object({ name: t.String() }) });

		const response = await app.handle(
			new Request("http://localhost/gadgets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
		);
		expect(response.status).toBe(422);

		const metricsResponse = await app.handle(
			new Request("http://localhost/metrics"),
		);
		const body = await metricsResponse.text();

		const requestsLine = body
			.split("\n")
			.find(
				(line) =>
					line.startsWith("control_api_http_requests_total") &&
					line.includes('route="/gadgets"'),
			);

		expect(requestsLine).toBeDefined();
		expect(requestsLine).toContain('status="422"');
	});
});
