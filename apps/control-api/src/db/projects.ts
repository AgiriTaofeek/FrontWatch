import { eq } from "drizzle-orm";
import { db } from "./client";
import { projects } from "./schema";

export async function getProject(id: string) {
	const [project] = await db.select().from(projects).where(eq(projects.id, id));
	return project ?? null;
}
