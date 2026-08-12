import { Elysia } from "elysia";
import { projectsRoutes } from "./routes/projects";

export const app = new Elysia().use(projectsRoutes).listen(3000);

console.log(
	`control-api listening on http://${app.server?.hostname}:${app.server?.port}`,
);
