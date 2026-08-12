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
		"/:id",
		async ({ params, status }) => {
			const [project] = await db
				.select()
				.from(projects)
				.where(eq(projects.id, params.id));

			if (!project) {
				return status(404, { error: "project not found" });
			}

			return project;
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
