import { eq } from "drizzle-orm";
import { db } from "./client";
import { environments } from "./schema";

export async function getEnvironment(id: string) {
	const [environment] = await db
		.select()
		.from(environments)
		.where(eq(environments.id, id));
	return environment ?? null;
}

export async function listEnvironments(applicationId: string) {
	return db
		.select()
		.from(environments)
		.where(eq(environments.applicationId, applicationId));
}

export async function createEnvironment(
	applicationId: string,
	name: string,
	type: "development" | "staging" | "production" | "custom",
) {
	const [environment] = await db
		.insert(environments)
		.values({ applicationId, name, type })
		.returning();
	if (!environment) {
		throw new Error("failed to create environment");
	}
	return environment;
}
