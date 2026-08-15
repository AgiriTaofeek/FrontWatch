import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { errorHandlingPlugin } from "./errorHandling";

// Failure recovery (PROGRESS.md's Step 9 entry): real chaos testing
// found control-api had no global error handler — an uncaught
// exception (a stopped Postgres container, concretely) produced
// Elysia's raw default response, which included the literal failed
// SQL query and its bound parameters. errorHandlingPlugin closes that.
describe("errorHandlingPlugin", () => {
	it("maps an uncaught exception to a clean 503, without leaking the real error to the response body", async () => {
		const app = new Elysia().use(errorHandlingPlugin()).get("/boom", () => {
			throw new Error(
				"connect ECONNREFUSED 127.0.0.1:5432 — secret internal detail",
			);
		});

		const response = await app.handle(new Request("http://localhost/boom"));
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body).toEqual({
			error: {
				code: "DEPENDENCY_UNAVAILABLE",
				message: "temporarily unable to process this request, retry shortly",
			},
		});
	});

	it("leaves Elysia's own validation error response untouched", async () => {
		const app = new Elysia()
			.use(errorHandlingPlugin())
			.post("/widgets", () => "ok", { body: t.Object({ name: t.String() }) });

		const response = await app.handle(
			new Request("http://localhost/widgets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
		);

		// Still Elysia's default validation status — errorHandlingPlugin
		// explicitly returns early (no override) for code === "VALIDATION".
		expect(response.status).toBe(422);
	});

	it("leaves a route's own explicit status(...) response untouched — those are normal returns, never thrown, so onError never even sees them", async () => {
		const app = new Elysia()
			.use(errorHandlingPlugin())
			.get("/not-a-member", ({ status }) =>
				status(404, { error: "not found" }),
			);

		const response = await app.handle(
			new Request("http://localhost/not-a-member"),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: "not found" });
	});

	// The gotcha this test file's own top comment (and errorHandling.ts's)
	// describes: onError only covers routes registered *after* it in the
	// same instance's .use() chain. A route merged in *before*
	// errorHandlingPlugin() must NOT be covered — proving the ordering
	// requirement is real, not just documented.
	it("does not cover a route merged in before it — confirms the registration-order requirement is real", async () => {
		const before = new Elysia().get("/boom-before", () => {
			throw new Error("thrown before errorHandlingPlugin was registered");
		});

		const app = new Elysia().use(before).use(errorHandlingPlugin());

		const response = await app.handle(
			new Request("http://localhost/boom-before"),
		);

		// Elysia's own default uncaught-exception response, not ours —
		// proves the order matters, matching what index.ts's own comment
		// warns about.
		expect(response.status).not.toBe(503);
	});
});
