import { Elysia } from "elysia";
import { issuesRoutes } from "./routes/issues";
import { networkRoutes } from "./routes/network";
import { projectsRoutes } from "./routes/projects";
import { sessionsRoutes } from "./routes/sessions";

// api-contracts.md documents every control-plane endpoint under
// /api/v1/... — ingestion already follows this (/ingest/v1/events).
// The prefix is applied once, here, rather than per route file, so
// route-level tests (projects.test.ts) can keep testing against
// unprefixed paths by calling the route module directly instead of
// going through this composition.
export const app = new Elysia({ prefix: "/api/v1" })
	.use(projectsRoutes)
	.use(issuesRoutes)
	.use(networkRoutes)
	.use(sessionsRoutes)
	.listen(3000);

console.log(
	`control-api listening on http://${app.server?.hostname}:${app.server?.port}`,
);
