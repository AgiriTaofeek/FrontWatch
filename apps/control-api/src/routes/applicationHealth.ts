import { Elysia, t } from "elysia";
import { getApplicationHealth } from "../db/applicationHealth";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// health-monitoring.md / US-12.01 — same RBAC-enforcement shape as
// issues.ts/network.ts/performance.ts. Distinct route (and name) from
// lib/health.ts's healthRoutes (control-api's own liveness/readiness) —
// this is about the *monitored application's* health.
export const applicationHealthRoutes = new Elysia().use(authPlugin()).get(
	"/projects/:projectId/health",
	async ({ params, principal, query, status }) => {
		const auth = await authorizeProjectAccess(
			principal,
			params.projectId,
			"viewer",
		);
		if (!auth.ok) {
			return status(auth.status, { error: auth.error });
		}

		const health = await getApplicationHealth(
			params.projectId,
			query.windowMinutes ? Number(query.windowMinutes) : undefined,
		);
		return health;
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			windowMinutes: t.Optional(t.String()),
		}),
	},
);
