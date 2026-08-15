import { Elysia } from "elysia";

// ADR-026: every service exposes /health/live and /health/ready with
// the same meaning. Liveness never touches a dependency (a slow
// Postgres must never make a live process look dead to an
// orchestrator's liveness probe) — same shape as
// services/data-plane's internal/platform/health.Register, just in
// TypeScript for control-api.
export type Checker = () => Promise<void>;

interface CheckResult {
	status: "up" | "down";
	error?: string;
}

// healthRoutes returns a standalone Elysia plugin — mount it on the
// *unprefixed* root app, not inside the /api/v1-prefixed sub-app
// (confirmed empirically: a plugin merged via .use() inherits its
// parent's prefix in Elysia 1.4, so /health/live would otherwise
// become /api/v1/health/live, which no orchestrator or `docker
// healthcheck` config expects).
export function healthRoutes(checks: Record<string, Checker>) {
	return new Elysia()
		.get("/health/live", () => new Response(null, { status: 200 }))
		.get("/health/ready", async ({ set }) => {
			const results: Record<string, CheckResult> = {};
			let ready = true;

			await Promise.all(
				Object.entries(checks).map(async ([name, check]) => {
					try {
						await check();
						results[name] = { status: "up" };
					} catch (err) {
						ready = false;
						results[name] = {
							status: "down",
							error: err instanceof Error ? err.message : String(err),
						};
					}
				}),
			);

			set.status = ready ? 200 : 503;
			return { checks: results };
		});
}
