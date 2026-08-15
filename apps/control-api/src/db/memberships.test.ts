import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { getMembership, listMembershipsForUser } from "./memberships";
import { memberships, organizations, users } from "./schema";

let userId: string;
let organizationId: string;
let disabledOrgId: string;

afterAll(async () => {
	await db.delete(memberships).where(eq(memberships.userId, userId));
	await db.delete(users).where(eq(users.id, userId));
	await db.delete(organizations).where(eq(organizations.id, organizationId));
	await db.delete(organizations).where(eq(organizations.id, disabledOrgId));
});

describe("listMembershipsForUser / getMembership", () => {
	it("returns only active memberships, with the joined organization name", async () => {
		const [user] = await db
			.insert(users)
			.values({
				email: `memberships_test_${Date.now()}@example.com`,
				name: "Membership Test User",
				passwordHash: "irrelevant",
			})
			.returning();
		if (!user) throw new Error("failed to seed test user");
		userId = user.id;

		const [org] = await db
			.insert(organizations)
			.values({ name: "Active Org" })
			.returning();
		if (!org) throw new Error("failed to seed test organization");
		organizationId = org.id;

		const [disabledOrg] = await db
			.insert(organizations)
			.values({ name: "Disabled-Membership Org" })
			.returning();
		if (!disabledOrg) throw new Error("failed to seed test organization");
		disabledOrgId = disabledOrg.id;

		await db.insert(memberships).values([
			{
				organizationId: org.id,
				userId: user.id,
				role: "administrator",
				status: "active",
			},
			{
				organizationId: disabledOrg.id,
				userId: user.id,
				role: "viewer",
				// US-01.03: a disabled membership must never surface as
				// usable access.
				status: "disabled",
			},
		]);

		const active = await listMembershipsForUser(user.id);
		expect(active).toHaveLength(1);
		expect(active[0]?.organizationName).toBe("Active Org");
		expect(active[0]?.role).toBe("administrator");

		const membership = await getMembership(user.id, org.id);
		expect(membership?.role).toBe("administrator");

		const noMembership = await getMembership(
			user.id,
			"00000000-0000-0000-0000-000000000000",
		);
		expect(noMembership).toBeNull();
	});
});
