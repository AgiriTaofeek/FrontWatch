import { Elysia, t } from "elysia";
import {
	createApplication,
	getApplication,
	listApplications,
} from "../db/applications";
import {
	authorizeApplicationAccess,
	authorizeOrganizationAccess,
} from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Same RBAC-enforcement shape as projects.ts — Application sits one
// level above Project in data-model.md §1's hierarchy, so creation
// authorizes against the organization the request names (like
// projects.ts's own POST /), while read routes authorize against the
// application itself once one exists (like projects.ts's own
// GET /:projectId).
export const applicationsRoutes = new Elysia()
	.use(authPlugin())
	.post(
		"/applications",
		async ({ body, principal, status }) => {
			const auth = await authorizeOrganizationAccess(
				principal,
				body.organizationId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const application = await createApplication(
				body.organizationId,
				body.name,
				body.framework,
			);
			return application;
		},
		{
			body: t.Object({
				organizationId: t.String({ format: "uuid" }),
				name: t.String({ minLength: 1 }),
				framework: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/organizations/:organizationId/applications",
		async ({ params, principal, status }) => {
			const auth = await authorizeOrganizationAccess(
				principal,
				params.organizationId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const applications = await listApplications(params.organizationId);
			return { applications };
		},
		{
			params: t.Object({ organizationId: t.String({ format: "uuid" }) }),
		},
	)
	.get(
		"/applications/:applicationId",
		async ({ params, principal, status }) => {
			const auth = await authorizeApplicationAccess(
				principal,
				params.applicationId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const application = await getApplication(params.applicationId);
			if (!application) {
				return status(404, { error: "application not found" });
			}
			return application;
		},
		{
			params: t.Object({ applicationId: t.String({ format: "uuid" }) }),
		},
	);
