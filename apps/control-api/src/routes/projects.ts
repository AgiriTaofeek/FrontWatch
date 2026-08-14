import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/client";
import { projects } from "../db/schema";
import { generatePublicKey } from "../lib/keys";

// Minimal — no auth/RBAC yet (PROGRESS.md Step 2). Anyone who can reach this
// service can create a project right now. Deliberately deferred, not an
// oversight — see ADR referenced in PROGRESS.md's Step 1.5 auth note.
export const projectsRoutes = new Elysia({ prefix: "/projects" })
	.post(
		"/",
		async ({ body }) => {
			const [project] = await db
				.insert(projects)
				.values({
					applicationId: body?.applicationId,
					environmentId: body?.environmentId,
					publicKey: generatePublicKey(),
				})
				.returning();

			return project;
		},
		{
			body: t.Optional(
				t.Object({
					applicationId: t.Optional(t.String({ format: "uuid" })),
					environmentId: t.Optional(t.String({ format: "uuid" })),
				}),
			),
		},
	)
	.get(
		"/:projectId",
		async ({ params, status }) => {
			const [project] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, params.projectId));

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
