import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/client";
import { getReleaseHealth } from "../db/releaseHealth";
import { releases } from "../db/schema";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice: "engineer" or higher to record a
// release (a real write with operational consequences — it's what
// release-health tracking keys off), "viewer" (any active member) to
// read.
export const releasesRoutes = new Elysia()
	.use(authPlugin())
	.post(
		"/projects/:projectId/releases",
		async ({ params, body, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const [release] = await db
				.insert(releases)
				.values({
					projectId: params.projectId,
					version: body.version,
					commitSha: body.commitSha,
					// Explicit deployedAt lets a CI/CD pipeline backfill a
					// release record after the fact (e.g. a deploy script that
					// only calls this endpoint once the rollout is confirmed
					// healthy, minutes after the actual deploy) — defaulting
					// to "now" only when the caller doesn't know better.
					deployedAt: body.deployedAt ? new Date(body.deployedAt) : undefined,
				})
				.onConflictDoNothing()
				.returning();

			// onConflictDoNothing() returns an empty array on the unique
			// (project_id, version) constraint instead of throwing — a
			// deploy script re-running the same request (network retry, a
			// re-triggered CI job) should see a clear "this already exists"
			// response, not a raw Postgres constraint-violation error or a
			// silently-different record.
			if (!release) {
				return status(409, {
					error: "a release with this version already exists for this project",
				});
			}

			return release;
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			body: t.Object({
				version: t.String({ minLength: 1 }),
				commitSha: t.Optional(t.String()),
				deployedAt: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/projects/:projectId/releases",
		async ({ params, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const rows = await db
				.select()
				.from(releases)
				.where(eq(releases.projectId, params.projectId))
				// Newest first — release-investigation.md's flow starts at
				// "Releases → select release," and the release someone just
				// shipped is overwhelmingly the one they're most likely
				// investigating.
				.orderBy(desc(releases.deployedAt));

			return { releases: rows };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		},
	)
	.get(
		"/projects/:projectId/releases/:version/health",
		async ({ params, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const health = await getReleaseHealth(params.projectId, params.version);
			if (!health) {
				return status(404, { error: "release not found" });
			}
			return health;
		},
		{
			params: t.Object({
				projectId: t.String({ format: "uuid" }),
				version: t.String(),
			}),
		},
	);
