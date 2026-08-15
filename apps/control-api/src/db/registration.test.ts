import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
	DuplicateEmailError,
	registerOrganizationAndAdmin,
} from "./registration";
import { memberships, organizations, users } from "./schema";

// Integration test — hits the real local Postgres, same pattern as
// every other db/*.test.ts file.

const createdUserIds: string[] = [];
const createdOrganizationIds: string[] = [];

afterAll(async () => {
	for (const userId of createdUserIds) {
		await db.delete(memberships).where(eq(memberships.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
	}
	for (const organizationId of createdOrganizationIds) {
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
});

describe("registerOrganizationAndAdmin", () => {
	it("creates an organization, a user, and an administrator membership atomically (US-01.01)", async () => {
		const email = `register_test_${Date.now()}@example.com`;

		const result = await registerOrganizationAndAdmin({
			organizationName: "Test Org",
			email,
			name: "Test Admin",
			passwordHash: "irrelevant-for-this-test",
		});
		createdUserIds.push(result.userId);
		createdOrganizationIds.push(result.organizationId);

		const [organization] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, result.organizationId));
		expect(organization?.name).toBe("Test Org");

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, result.userId));
		expect(user?.email).toBe(email);

		const [membership] = await db
			.select()
			.from(memberships)
			.where(eq(memberships.id, result.membershipId));
		expect(membership?.role).toBe("administrator");
		expect(membership?.organizationId).toBe(result.organizationId);
		expect(membership?.userId).toBe(result.userId);
	});

	it("rejects a duplicate email and rolls back the organization it would have created", async () => {
		const email = `register_dup_test_${Date.now()}@example.com`;

		const first = await registerOrganizationAndAdmin({
			organizationName: "First Org",
			email,
			name: "First Admin",
			passwordHash: "irrelevant",
		});
		createdUserIds.push(first.userId);
		createdOrganizationIds.push(first.organizationId);

		await expect(
			registerOrganizationAndAdmin({
				organizationName: "Second Org",
				email,
				name: "Second Admin",
				passwordHash: "irrelevant",
			}),
		).rejects.toThrow(DuplicateEmailError);

		// The transaction must have rolled back — "Second Org" should
		// never have been persisted, not left behind as an orphan with
		// no administrator.
		const orphaned = await db
			.select()
			.from(organizations)
			.where(eq(organizations.name, "Second Org"));
		expect(orphaned).toHaveLength(0);
	});
});
