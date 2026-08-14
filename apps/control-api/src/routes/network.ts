import { Elysia, t } from "elysia";
import { listNetworkResources } from "../db/network";

// No auth/RBAC yet, same scope note as issues.ts/projects.ts
// (PROGRESS.md Step 2) — deferred to Step 9, not an oversight.
export const networkRoutes = new Elysia().get(
	"/projects/:projectId/network",
	async ({ params, query }) => {
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
