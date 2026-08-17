import { Elysia, t } from "elysia";
import { parseClickHouseTimeRangeQuery } from "../db/clickhouse";
import { getSession, listSessions, parseSessionId } from "../db/sessions";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice, same shape as issues.ts.
export const sessionsRoutes = new Elysia()
	.use(authPlugin())
	.get(
		"/projects/:projectId/sessions",
		async ({ params, principal, query, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const sessions = await listSessions(params.projectId, {
				...parseClickHouseTimeRangeQuery(query),
				limit: query.limit,
			});
			return { sessions };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			query: t.Object({
				from: t.Optional(t.String()),
				to: t.Optional(t.String()),
				// t.Number, not t.String — see issues.ts's identical comment.
				limit: t.Optional(t.Number({ minimum: 1 })),
			}),
		},
	)
	.get(
		"/sessions/:sessionId",
		async ({ params, principal, status }) => {
			const parsed = parseSessionId(params.sessionId);
			if (!parsed) {
				return status(400, { error: "malformed session id" });
			}

			const auth = await authorizeProjectAccess(
				principal,
				parsed.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
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
