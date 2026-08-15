import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
	createAuthSession,
	deleteAuthSession,
	getAuthSessionByTokenHash,
} from "./authSessions";
import { db } from "./client";
import { authSessions, users } from "./schema";

let userId: string;

afterAll(async () => {
	if (userId) {
		await db.delete(authSessions).where(eq(authSessions.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
	}
});

async function seedUser(): Promise<string> {
	const [user] = await db
		.insert(users)
		.values({
			email: `auth_sessions_test_${Date.now()}@example.com`,
			name: "Session Test User",
			passwordHash: "irrelevant",
		})
		.returning();
	if (!user) throw new Error("failed to seed test user");
	return user.id;
}

describe("createAuthSession / getAuthSessionByTokenHash", () => {
	it("creates a session and looks it up by its token hash", async () => {
		userId = await seedUser();
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

		const created = await createAuthSession(userId, "fake_hash_1", expiresAt);
		expect(created?.userId).toBe(userId);

		const found = await getAuthSessionByTokenHash("fake_hash_1");
		expect(found?.id).toBe(created?.id);
		expect(found?.userId).toBe(userId);
	});

	it("returns null for a token hash that was never issued", async () => {
		const found = await getAuthSessionByTokenHash("never_issued_hash");
		expect(found).toBeNull();
	});
});

describe("deleteAuthSession", () => {
	it("revokes a session — it can no longer be found afterward (auth.md's revocation requirement)", async () => {
		await createAuthSession(
			userId,
			"fake_hash_2",
			new Date(Date.now() + 1000 * 60 * 60),
		);
		expect(await getAuthSessionByTokenHash("fake_hash_2")).not.toBeNull();

		await deleteAuthSession("fake_hash_2");

		expect(await getAuthSessionByTokenHash("fake_hash_2")).toBeNull();
	});
});
