import { Elysia, t } from "elysia";
import { listPerformanceMetrics } from "../db/performance";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice, same shape as issues.ts/network.ts.
export const performanceRoutes = new Elysia().use(authPlugin()).get(
	"/projects/:projectId/performance",
	async ({ params, principal, query, status }) => {
		const auth = await authorizeProjectAccess(
			principal,
			params.projectId,
			"viewer",
		);
		if (!auth.ok) {
			return status(auth.status, { error: auth.error });
		}

		const metrics = await listPerformanceMetrics(params.projectId, {
			route: query.route,
			from: query.from,
			to: query.to,
		});
		return { metrics };
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			route: t.Optional(t.String()),
			from: t.Optional(t.String()),
			to: t.Optional(t.String()),
		}),
	},
);
