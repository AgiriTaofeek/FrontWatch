import { eq } from "drizzle-orm";
import { db } from "./client";
import { organizations } from "./schema";

export async function getOrganization(id: string) {
	const [organization] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, id));
	return organization ?? null;
}
