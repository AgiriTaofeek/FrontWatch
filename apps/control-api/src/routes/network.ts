import { Elysia, t } from "elysia";
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
			route: query.route,
			from: query.from,
			to: query.to,
			limit: query.limit ? Number(query.limit) : undefined,
		});
		return { resources };
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		query: t.Object({
			route: t.Optional(t.String()),
			from: t.Optional(t.String()),
			to: t.Optional(t.String()),
			limit: t.Optional(t.String()),
		}),
	},
);
