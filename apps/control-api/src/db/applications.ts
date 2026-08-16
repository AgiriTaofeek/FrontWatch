import { eq } from "drizzle-orm";
import { db } from "./client";
import { applications } from "./schema";

export async function getApplication(id: string) {
	const [application] = await db
		.select()
		.from(applications)
		.where(eq(applications.id, id));
	return application ?? null;
}

export async function listApplications(organizationId: string) {
	return db
		.select()
		.from(applications)
		.where(eq(applications.organizationId, organizationId));
}

export async function createApplication(
	organizationId: string,
	name: string,
	framework?: string,
) {
	const [application] = await db
		.insert(applications)
		.values({ organizationId, name, framework })
		.returning();
	if (!application) {
		throw new Error("failed to create application");
	}
	return application;
}
