import type { AuthenticatedPrincipal } from "@frontwatch/contracts";
import { getAuthSessionByTokenHash } from "../db/authSessions";
import { listMembershipsForUser } from "../db/memberships";
import { getUserById } from "../db/users";
import { hashSessionToken } from "./auth";

// The one place that turns "a raw session token from a cookie" into
// "an authenticated principal" — routes/auth.ts's /auth/me uses this
// directly; the RBAC-enforcement PR (next, per the split confirmed
// with the user) reuses this same function as its authorization
// middleware's first step, rather than reimplementing session lookup
// a second time.
export async function resolveSessionPrincipal(
	rawToken: string | undefined,
): Promise<AuthenticatedPrincipal | null> {
	if (!rawToken) {
		return null;
	}

	const tokenHash = hashSessionToken(rawToken);
	const session = await getAuthSessionByTokenHash(tokenHash);
	if (!session) {
		return null;
	}

	// Expired sessions are treated as absent, not actively deleted here
	// — a lazy-cleanup read path shouldn't also carry a write on every
	// single request. A real expired-session sweep is deferred,
	// separate work (same "schema/behavior now, background cleanup
	// later" shape as other deferred items this session).
	if (session.expiresAt.getTime() < Date.now()) {
		return null;
	}

	const user = await getUserById(session.userId);
	// US-01.03: "removing a user's access immediately prevents further
	// authorized actions" — a disabled user's still-valid session token
	// must stop working the moment their account is disabled, not just
	// once the token itself expires.
	if (user?.status !== "active") {
		return null;
	}

	const memberships = await listMembershipsForUser(user.id);

	return {
		userId: user.id,
		email: user.email,
		name: user.name,
		memberships,
	};
}
