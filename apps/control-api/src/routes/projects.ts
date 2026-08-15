import { Elysia, t } from "elysia";
import { db } from "../db/client";
import { getProject } from "../db/projects";
import { projects } from "../db/schema";
import {
	authorizeOrganizationAccess,
	authorizeProjectAccess,
} from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";
import { generatePublicKey } from "../lib/keys";

// Step 9's RBAC-enforcement slice: every project-scoped route now
// requires a real authenticated principal with sufficient membership
// role in the project's (or, for creation, the request's own)
// organization — security-architecture.md §6's "authorization
// resolves principal -> organization membership -> project scope ->
// requested action," enforced for real via lib/authorization.ts.
export const projectsRoutes = new Elysia({ prefix: "/projects" })
	.use(authPlugin())
	.post(
		"/",
		async ({ body, principal, status }) => {
			const auth = await authorizeOrganizationAccess(
				principal,
				body.organizationId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const [project] = await db
				.insert(projects)
				.values({
					organizationId: body.organizationId,
					applicationId: body.applicationId,
					environmentId: body.environmentId,
					publicKey: generatePublicKey(),
				})
				.returning();

			return project;
		},
		{
			body: t.Object({
				organizationId: t.String({ format: "uuid" }),
				applicationId: t.Optional(t.String({ format: "uuid" })),
				environmentId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:projectId",
		async ({ params, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			// authorizeProjectAccess already confirmed this project exists
			// (a 404 above means it didn't) — this second lookup just gets
			// the full row to return, using the same shared helper rather
			// than a separate inline query.
			const project = await getProject(params.projectId);
			if (!project) {
				return status(404, { error: "project not found" });
			}

			return project;
		},
		{
			params: t.Object({
				// Named to match issues.ts's /projects/:projectId/issues —
				// Elysia's router (memoirist) rejects two different
				// parameter names at the same URL position across merged
				// route trees. Found by actually starting the composed
				// app (index.ts), not by either route file's isolated
				// tests, which each only ever loaded one module alone.
				projectId: t.String({ format: "uuid" }),
			}),
		},
	);
