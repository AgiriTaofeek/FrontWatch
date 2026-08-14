import { Elysia, t } from "elysia";
import { listPerformanceMetrics } from "../db/performance";

// No auth/RBAC yet, same scope note as issues.ts/network.ts/
// sessions.ts/projects.ts (PROGRESS.md Step 2) — deferred to Step 9,
// not an oversight.
export const performanceRoutes = new Elysia().get(
	"/projects/:projectId/performance",
	async ({ params, query }) => {
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
