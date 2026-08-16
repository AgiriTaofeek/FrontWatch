import { Elysia, t } from "elysia";
import {
	createEnvironment,
	getEnvironment,
	listEnvironments,
} from "../db/environments";
import {
	authorizeApplicationAccess,
	authorizeEnvironmentAccess,
} from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Same RBAC-enforcement shape as applications.ts, one level down
// data-model.md §1's hierarchy.
export const environmentsRoutes = new Elysia()
	.use(authPlugin())
	.post(
		"/environments",
		async ({ body, principal, status }) => {
			const auth = await authorizeApplicationAccess(
				principal,
				body.applicationId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const environment = await createEnvironment(
				body.applicationId,
				body.name,
				body.type,
			);
			return environment;
		},
		{
			body: t.Object({
				applicationId: t.String({ format: "uuid" }),
				name: t.String({ minLength: 1 }),
				// No default (schema.ts's own comment: silently defaulting to
				// "production" would be actively dangerous) — the request must
				// name one explicitly.
				type: t.Union([
					t.Literal("development"),
					t.Literal("staging"),
					t.Literal("production"),
					t.Literal("custom"),
				]),
			}),
		},
	)
	.get(
		"/applications/:applicationId/environments",
		async ({ params, principal, status }) => {
			const auth = await authorizeApplicationAccess(
				principal,
				params.applicationId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const environments = await listEnvironments(params.applicationId);
			return { environments };
		},
		{
			params: t.Object({ applicationId: t.String({ format: "uuid" }) }),
		},
	)
	.get(
		"/environments/:environmentId",
		async ({ params, principal, status }) => {
			const auth = await authorizeEnvironmentAccess(
				principal,
				params.environmentId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const environment = await getEnvironment(params.environmentId);
			if (!environment) {
				return status(404, { error: "environment not found" });
			}
			return environment;
		},
		{
			params: t.Object({ environmentId: t.String({ format: "uuid" }) }),
		},
	);
