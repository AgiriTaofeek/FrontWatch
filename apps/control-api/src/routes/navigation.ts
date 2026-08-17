import { Elysia, t } from "elysia";
import { parseClickHouseTimeRangeQuery } from "../db/clickhouse";
import { listNavigationTransitions } from "../db/navigation";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement shape, same pattern as network.ts.
export const navigationRoutes = new Elysia().use(authPlugin()).get(
	"/projects/:projectId/navigation",
	async ({ params, principal, query, status }) => {
		const auth = await authorizeProjectAccess(
			principal,
			params.projectId,
			"viewer",
		);
		if (!auth.ok) {
			return status(auth.status, { error: auth.error });
		}

		const transitions = await listNavigationTransitions(params.projectId, {
			release: query.release,
			...parseClickHouseTimeRangeQuery(query),
			limit: query.limit,
		});
		return { transitions };
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			release: t.Optional(t.String()),
			from: t.Optional(t.String()),
			to: t.Optional(t.String()),
			// t.Number, not t.String — see issues.ts's identical comment.
			limit: t.Optional(t.Number({ minimum: 1 })),
		}),
	},
);
