import { Elysia, t } from "elysia";
import { getSession, listSessions, parseSessionId } from "../db/sessions";

// No auth/RBAC yet, same scope note as issues.ts/network.ts/projects.ts
// (PROGRESS.md Step 2) — deferred to Step 9, not an oversight.
export const sessionsRoutes = new Elysia()
	.get(
		"/projects/:projectId/sessions",
		async ({ params, query }) => {
			const sessions = await listSessions(params.projectId, {
				from: query.from,
				to: query.to,
				limit: query.limit ? Number(query.limit) : undefined,
			});
			return { sessions };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			query: t.Object({
				from: t.Optional(t.String()),
				to: t.Optional(t.String()),
				limit: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/sessions/:sessionId",
		async ({ params, status }) => {
			const parsed = parseSessionId(params.sessionId);
			if (!parsed) {
				return status(400, { error: "malformed session id" });
			}

			const session = await getSession(parsed.projectId, parsed.rawSessionId);
			if (!session) {
				return status(404, { error: "session not found" });
			}

			return session;
		},
		{
			params: t.Object({ sessionId: t.String() }),
		},
	);
