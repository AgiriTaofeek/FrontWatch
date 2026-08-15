import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { clickhouse } from "./db/clickhouse";
import { db } from "./db/client";
import { authPlugin } from "./lib/authPlugin";
import { errorHandlingPlugin } from "./lib/errorHandling";
import { healthRoutes } from "./lib/health";
import { metricsPlugin } from "./lib/metrics";
import { alertRulesRoutes } from "./routes/alertRules";
import { authRoutes } from "./routes/auth";
import { issuesRoutes } from "./routes/issues";
import { networkRoutes } from "./routes/network";
import { performanceRoutes } from "./routes/performance";
import { projectsRoutes } from "./routes/projects";
import { releasesRoutes } from "./routes/releases";
import { sessionsRoutes } from "./routes/sessions";

// api-contracts.md documents every control-plane endpoint under
// /api/v1/... — ingestion already follows this (/ingest/v1/events).
// The prefix is applied once, here, rather than per route file, so
// route-level tests (projects.test.ts) can keep testing against
// unprefixed paths by calling the route module directly instead of
// going through this composition.
const api = new Elysia({ prefix: "/api/v1" })
	.use(authPlugin())
	.use(authRoutes)
	.use(projectsRoutes)
	.use(issuesRoutes)
	.use(networkRoutes)
	.use(sessionsRoutes)
	.use(performanceRoutes)
	.use(releasesRoutes)
	.use(alertRulesRoutes);

// health/metrics are mounted on the *unprefixed* root instance, not
// merged into `api` above — confirmed empirically that a plugin
// merged via .use() inherits its parent Elysia instance's prefix, so
// nesting them inside `api` would produce /api/v1/health/live, which
// no orchestrator or `docker healthcheck` config expects (ADR-026).
export const app = new Elysia()
	// Registered first, deliberately — see errorHandlingPlugin's own
	// comment: onError only covers routes registered *after* it in
	// this chain, so it must come before healthRoutes/api below.
	.use(errorHandlingPlugin())
	.use(metricsPlugin())
	.use(
		healthRoutes({
			postgres: async () => {
				await db.execute(sql`select 1`);
			},
			clickhouse: async () => {
				// select: true forces a real query instead of the bare
				// /ping endpoint, which "does not verify credentials" per
				// @clickhouse/client's own docs — a readiness check that
				// can't catch a credentials problem isn't verifying much.
				const result = await clickhouse.ping({ select: true });
				if (!result.success) {
					throw result.error;
				}
			},
		}),
	)
	.use(api)
	.listen(3000);

console.log(
	`control-api listening on http://${app.server?.hostname}:${app.server?.port}`,
);
