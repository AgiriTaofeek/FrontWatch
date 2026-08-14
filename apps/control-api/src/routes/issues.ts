import { Elysia, t } from "elysia";
import { getIssue, listIssues, parseIssueId } from "../db/issues";

// No auth/RBAC yet, same scope note as projects.ts (PROGRESS.md Step 2)
// — deferred to Step 9, not an oversight.
export const issuesRoutes = new Elysia()
	.get(
		"/projects/:projectId/issues",
		async ({ params, query }) => {
			const issues = await listIssues(params.projectId, {
				release: query.release,
				route: query.route,
				from: query.from,
				to: query.to,
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
		async ({ params, status }) => {
			const parsed = parseIssueId(params.issueId);
			if (!parsed) {
				return status(400, { error: "malformed issue id" });
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
