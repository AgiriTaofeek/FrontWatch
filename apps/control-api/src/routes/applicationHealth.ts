import { Elysia, t } from "elysia";
import { getApplicationHealth } from "../db/applicationHealth";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// health-monitoring.md / US-12.01 — same RBAC-enforcement shape as
// issues.ts/network.ts/performance.ts. Distinct route (and name) from
// lib/health.ts's healthRoutes (control-api's own liveness/readiness) —
// this is about the *monitored application's* health.
export const applicationHealthRoutes = new Elysia().use(authPlugin()).get(
	"/projects/:projectId/health",
	async ({ params, principal, query, status }) => {
		const auth = await authorizeProjectAccess(
			principal,
			params.projectId,
			"viewer",
		);
		if (!auth.ok) {
			return status(auth.status, { error: auth.error });
		}

		const health = await getApplicationHealth(
			params.projectId,
			query.windowMinutes,
		);
		return health;
	},
	{
		params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		// t.Number, not t.String — Elysia 1.1+ coerces t.Number for
		// query/params schemas automatically (same effect as t.Numeric),
		// which closes a real, previously-missing validation gap for free:
		// a non-numeric or negative windowMinutes ("abc", "-60") is now
		// rejected with a clean 422 before the handler ever runs, instead
		// of producing NaN / an Invalid Date that later throws inside
		// toClickHouseDateTime64() and gets mislabeled as a 503 "dependency
		// unavailable" (confirmed the old behavior actually did that, not
		// assumed). minimum: 1 also closes the negative-window bug where
		// windowStart could land in the future and misreport an actively-
		// erroring app as "stale".
		query: t.Object({
			windowMinutes: t.Optional(t.Number({ minimum: 1 })),
		}),
	},
);
