import { Elysia, t } from "elysia";
import { parseClickHouseTimeRangeQuery } from "../db/clickhouse";
import { listNetworkResources } from "../db/network";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice, same shape as issues.ts.
export const networkRoutes = new Elysia().use(authPlugin()).get(
	"/projects/:projectId/network",
	async ({ params, principal, query, status }) => {
		const auth = await authorizeProjectAccess(
			principal,
			params.projectId,
			"viewer",
		);
		if (!auth.ok) {
			return status(auth.status, { error: auth.error });
		}

		const resources = await listNetworkResources(params.projectId, {
			// listNetworkResources's own ListNetworkResourcesFilters has
			// supported `release` since Step 7 (release-health's own
			// filtering needs it) — this route just never exposed it as a
			// real query param before now, a real, small pre-existing gap
			// found while wiring up the dashboard's own release filter.
			release: query.release,
			route: query.route,
			...parseClickHouseTimeRangeQuery(query),
			limit: query.limit,
		});
		return { resources };
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			release: t.Optional(t.String()),
			route: t.Optional(t.String()),
			from: t.Optional(t.String()),
			to: t.Optional(t.String()),
			// t.Number, not t.String — see issues.ts's identical comment for
			// why (Elysia's own coercion rejects a non-numeric limit with a
			// clean 422 instead of a NaN that later throws inside
			// ClickHouse's UInt32 binding).
			limit: t.Optional(t.Number({ minimum: 1 })),
		}),
	},
);
