import { Elysia, t } from "elysia";
import { parseClickHouseTimeRangeQuery } from "../db/clickhouse";
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
			// Same small pre-existing gap as network.ts: listPerformanceMetrics
			// already supports `release` (releaseHealth.ts's own filtering
			// needs it), this route just never exposed it as a real query param.
			release: query.release,
			route: query.route,
			...parseClickHouseTimeRangeQuery(query),
		});
		return { metrics };
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			release: t.Optional(t.String()),
			route: t.Optional(t.String()),
			// format: "date-time" — see issues.ts's identical comment.
			from: t.Optional(t.String({ format: "date-time" })),
			to: t.Optional(t.String({ format: "date-time" })),
		}),
	},
);
