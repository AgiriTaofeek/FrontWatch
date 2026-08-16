import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { createApplication } from "./applications";
import { db } from "./client";
import {
	createEnvironment,
	getEnvironment,
	listEnvironments,
} from "./environments";
import { applications, environments, organizations } from "./schema";

// Integration test — real local Postgres, same pattern as
// db/applications.test.ts.

const createdEnvironmentIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdOrganizationIds: string[] = [];

async function seedApplication(): Promise<string> {
	const [org] = await db
		.insert(organizations)
		.values({ name: `Test Org ${Date.now()}-${Math.random()}` })
		.returning();
	if (!org) throw new Error("failed to seed test organization");
	createdOrganizationIds.push(org.id);

	const application = await createApplication(org.id, "Test App");
	createdApplicationIds.push(application.id);
	return application.id;
}

afterAll(async () => {
	for (const id of createdEnvironmentIds) {
		await db.delete(environments).where(eq(environments.id, id));
	}
	for (const id of createdApplicationIds) {
		await db.delete(applications).where(eq(applications.id, id));
	}
	for (const id of createdOrganizationIds) {
		await db.delete(organizations).where(eq(organizations.id, id));
	}
});

describe("createEnvironment / getEnvironment / listEnvironments", () => {
	it("creates an environment with a generated id and default status", async () => {
		const applicationId = await seedApplication();

		const environment = await createEnvironment(
			applicationId,
			"Production",
			"production",
		);
		createdEnvironmentIds.push(environment.id);

		expect(environment.applicationId).toBe(applicationId);
		expect(environment.name).toBe("Production");
		expect(environment.type).toBe("production");
		expect(environment.status).toBe("active");
	});

	it("getEnvironment reads back a created environment", async () => {
		const applicationId = await seedApplication();
		const created = await createEnvironment(
			applicationId,
			"Staging",
			"staging",
		);
		createdEnvironmentIds.push(created.id);

		const fetched = await getEnvironment(created.id);

		expect(fetched?.id).toBe(created.id);
		expect(fetched?.type).toBe("staging");
	});

	it("getEnvironment returns null for an id that doesn't exist", async () => {
		const fetched = await getEnvironment(
			"00000000-0000-0000-0000-000000000000",
		);
		expect(fetched).toBeNull();
	});

	it("listEnvironments returns only the given application's environments", async () => {
		const appA = await seedApplication();
		const appB = await seedApplication();
		const envInA = await createEnvironment(appA, "Prod A", "production");
		createdEnvironmentIds.push(envInA.id);
		const envInB = await createEnvironment(appB, "Prod B", "production");
		createdEnvironmentIds.push(envInB.id);

		const listA = await listEnvironments(appA);

		expect(listA).toHaveLength(1);
		expect(listA[0]?.id).toBe(envInA.id);
	});

	it("listEnvironments returns an empty list for an application with none", async () => {
		const applicationId = await seedApplication();
		const list = await listEnvironments(applicationId);
		expect(list).toHaveLength(0);
	});
});
