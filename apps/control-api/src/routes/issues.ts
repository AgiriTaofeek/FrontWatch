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
				limit: query.limit,
			});
			return { issues };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			query: t.Object({
				release: t.Optional(t.String()),
				route: t.Optional(t.String()),
				// format: "date-time" — same reasoning as `limit` below: a
				// malformed from/to used to be silently dropped by
				// parseClickHouseTimeRangeQuery (a real, previously-shipped
				// behavior change flagged in code review) instead of telling
				// the caller their request was malformed. Rejected with a
				// clean 422 before the handler runs now; the string still
				// flows through parseClickHouseTimeRangeQuery unchanged
				// (kept as defensive-in-depth, not load-bearing for a
				// request that reaches this schema).
				from: t.Optional(t.String({ format: "date-time" })),
				to: t.Optional(t.String({ format: "date-time" })),
				// t.Number, not t.String — Elysia 1.1+ coerces t.Number for
				// query schemas automatically. A non-numeric limit ("abc")
				// used to become NaN (Number("abc")), which db/issues.ts's
				// own `filters.limit ?? DEFAULT_LIMIT` doesn't catch (?? only
				// substitutes on null/undefined, not NaN) — NaN would then
				// bind to a ClickHouse {limit:UInt32} param and throw,
				// surfacing as an uncaught 503 instead of a clean 400. Now
				// rejected before the handler runs. No `maximum` here
				// deliberately — db/issues.ts's own Math.min(..., MAX_LIMIT)
				// already clamps an oversized value rather than rejecting
				// it, an intentional, different tradeoff this fix doesn't
				// change.
				limit: t.Optional(t.Number({ minimum: 1 })),
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
