import { Elysia } from "elysia";

// operations.md's transport-mapping rule: "Internal errors never
// expose stack traces, SQL, internal topology, or secrets to API
// clients — they're logged with request/trace context instead."
// Real chaos testing (Failure recovery, PROGRESS.md's Step 9 entry)
// found control-api had no global error handler at all — a stopped
// Postgres container produced a raw 500 with the literal failed SQL
// query and its bound parameters dumped straight into the response
// body, Elysia's own default behavior for an uncaught exception, not
// anything this codebase controlled.
//
// A fourth real Elysia gotcha found and confirmed empirically this
// session (distinct from the three metrics.ts already documents —
// prefix inheritance, derive() needing .as("global") to propagate,
// onAfterResponse firing after .handle() resolves): onError only
// covers routes registered *after* it in the same instance's
// `.use()` chain, regardless of .as("global") — the opposite of
// derive()'s rule, where .as("global") alone is sufficient regardless
// of order. Confirmed via four throwaway probes: plugin-onError
// without .as("global") never fires on a merged child's route no
// matter where it's registered; WITH .as("global") it fires only when
// registered before the .use() call for the routes it should cover,
// not after. This is why errorHandlingPlugin() is `.use()`d first in
// index.ts's `app`, before healthRoutes/api.
//
// Every uncaught exception maps to the same safe 503 today — not
// because every failure really is "a dependency is down" in the
// general sense, but because that's honestly the only thing that CAN
// throw an uncaught exception anywhere in this codebase right now: a
// real audit for this fix found every route is a thin wrapper over a
// Postgres/ClickHouse call with no other business logic that throws
// (routes/*.ts's own explicit `status(...)` calls for 401/403/404/409
// never reach onError at all — they're normal returns, not throws).
// If control-api ever grows route logic that can throw for a genuine
// internal-bug reason unrelated to a dependency, this blanket mapping
// should be revisited to tell "internal bug" (500) apart from
// "dependency unavailable" (503) — deferred, not forgotten, not
// currently possible to get right without guessing at a distinction
// nothing in this codebase makes yet.
export function errorHandlingPlugin() {
	return new Elysia()
		.onError(({ code, error, set, request }) => {
			// Elysia's own recognized categories already produce a
			// reasonable response on their own (a 404 for no matching
			// route, 422 for a body/params schema mismatch, 400 for
			// unparseable JSON) — only reshape what's left: a genuinely
			// uncaught exception this codebase didn't anticipate.
			if (code === "VALIDATION" || code === "NOT_FOUND" || code === "PARSE") {
				return;
			}

			// Logged with real detail server-side — this is exactly what
			// operations.md asks for instead of exposing it to the caller.
			console.error(
				`[unhandled error] ${request.method} ${new URL(request.url).pathname}:`,
				error,
			);

			set.status = 503;
			return {
				error: {
					code: "DEPENDENCY_UNAVAILABLE",
					message: "temporarily unable to process this request, retry shortly",
				},
			};
		})
		.as("global");
}
