import { eq } from "drizzle-orm";
import { db } from "./client";
import { authSessions } from "./schema";

export async function createAuthSession(
	userId: string,
	tokenHash: string,
	expiresAt: Date,
) {
	const [session] = await db
		.insert(authSessions)
		.values({ userId, tokenHash, expiresAt })
		.returning();
	return session ?? null;
}

// Looks up a session by its token's hash — the raw token itself is
// never stored (ADR-027), so every lookup goes through this same
// hash-then-query path, never a direct token comparison.
export async function getAuthSessionByTokenHash(tokenHash: string) {
	const [session] = await db
		.select()
		.from(authSessions)
		.where(eq(authSessions.tokenHash, tokenHash));
	return session ?? null;
}

// Logout — auth.md's "revocation" requirement made real: deleting the
// row makes the session dead everywhere immediately, not just
// expired-eventually.
export async function deleteAuthSession(tokenHash: string) {
	await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}
