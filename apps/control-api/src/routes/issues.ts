import { Elysia, t } from "elysia";
import { parseClickHouseTimeRangeQuery } from "../db/clickhouse";
import { getIssue, listIssues, parseIssueId } from "../db/issues";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice: every read here requires an active
// membership (any role — "viewer" is the floor) in the project's
// organization. lib/authorization.ts's authorizeProjectAccess returns
// 404, not 403, for a project a cross-tenant principal can't see —
// existence itself is part of what tenant isolation protects.
export const issuesRoutes = new Elysia()
	.use(authPlugin())
	.get(
		"/projects/:projectId/issues",
		async ({ params, principal, query, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const issues = await listIssues(params.projectId, {
				release: query.release,
				route: query.route,
				...parseClickHouseTimeRangeQuery(query),
				limit: query.limit ? Number(query.limit) : undefined,
			});
			return { issues };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			query: t.Object({
				release: t.Optional(t.String()),
				route: t.Optional(t.String()),
				from: t.Optional(t.String()),
				to: t.Optional(t.String()),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/issues/:issueId",
		async ({ params, principal, status }) => {
			const parsed = parseIssueId(params.issueId);
			if (!parsed) {
				return status(400, { error: "malformed issue id" });
			}

			const auth = await authorizeProjectAccess(
				principal,
				parsed.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const issue = await getIssue(parsed.projectId, parsed.fingerprint);
			if (!issue) {
				return status(404, { error: "issue not found" });
			}

			return issue;
		},
		{
			params: t.Object({ issueId: t.String() }),
		},
	);
