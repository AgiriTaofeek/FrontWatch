import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
	createApplication,
	getApplication,
	listApplications,
} from "./applications";
import { db } from "./client";
import { applications, organizations } from "./schema";

// Integration test — real local Postgres, same pattern as
// db/releaseHealth.test.ts.

const createdApplicationIds: string[] = [];
const createdOrganizationIds: string[] = [];

async function seedOrganization(): Promise<string> {
	const [org] = await db
		.insert(organizations)
		.values({ name: `Test Org ${Date.now()}-${Math.random()}` })
		.returning();
	if (!org) throw new Error("failed to seed test organization");
	createdOrganizationIds.push(org.id);
	return org.id;
}

afterAll(async () => {
	for (const id of createdApplicationIds) {
		await db.delete(applications).where(eq(applications.id, id));
	}
	for (const id of createdOrganizationIds) {
		await db.delete(organizations).where(eq(organizations.id, id));
	}
});

describe("createApplication / getApplication / listApplications", () => {
	it("creates an application with a generated id and default status", async () => {
		const organizationId = await seedOrganization();

		const application = await createApplication(
			organizationId,
			"Storefront",
			"react",
		);
		createdApplicationIds.push(application.id);

		expect(application.organizationId).toBe(organizationId);
		expect(application.name).toBe("Storefront");
		expect(application.framework).toBe("react");
		expect(application.status).toBe("active");
	});

	it("framework is null when omitted, not an empty string", async () => {
		const organizationId = await seedOrganization();

		const application = await createApplication(organizationId, "Backoffice");
		createdApplicationIds.push(application.id);

		expect(application.framework).toBeNull();
	});

	it("getApplication reads back a created application", async () => {
		const organizationId = await seedOrganization();
		const created = await createApplication(organizationId, "Dashboard");
		createdApplicationIds.push(created.id);

		const fetched = await getApplication(created.id);

		expect(fetched?.id).toBe(created.id);
		expect(fetched?.name).toBe("Dashboard");
	});

	it("getApplication returns null for an id that doesn't exist", async () => {
		const fetched = await getApplication(
			"00000000-0000-0000-0000-000000000000",
		);
		expect(fetched).toBeNull();
	});

	it("listApplications returns only the given organization's applications", async () => {
		const orgA = await seedOrganization();
		const orgB = await seedOrganization();
		const appInA = await createApplication(orgA, "App in A");
		createdApplicationIds.push(appInA.id);
		const appInB = await createApplication(orgB, "App in B");
		createdApplicationIds.push(appInB.id);

		const listA = await listApplications(orgA);

		expect(listA).toHaveLength(1);
		expect(listA[0]?.id).toBe(appInA.id);
	});

	it("listApplications returns an empty list for an organization with none", async () => {
		const organizationId = await seedOrganization();
		const list = await listApplications(organizationId);
		expect(list).toHaveLength(0);
	});
});
