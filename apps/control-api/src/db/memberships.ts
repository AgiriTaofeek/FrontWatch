import type { MembershipRole } from "@frontwatch/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { memberships, organizations } from "./schema";

export interface MembershipWithOrganization {
	membershipId: string;
	role: MembershipRole;
	organizationId: string;
	organizationName: string;
}

// The dashboard's own "which organizations can this user act in, and
// with what role" — /auth/me's core answer (routes/auth.ts). Only
// active memberships: US-01.03's "removing a user's access
// immediately prevents further authorized actions" means a disabled
// membership must never surface as usable access.
export async function listMembershipsForUser(
	userId: string,
): Promise<MembershipWithOrganization[]> {
	const rows = await db
		.select({
			membershipId: memberships.id,
			role: memberships.role,
			organizationId: organizations.id,
			organizationName: organizations.name,
		})
		.from(memberships)
		.innerJoin(organizations, eq(memberships.organizationId, organizations.id))
		.where(
			and(eq(memberships.userId, userId), eq(memberships.status, "active")),
		);

	return rows;
}

export async function getMembership(userId: string, organizationId: string) {
	const [membership] = await db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.userId, userId),
				eq(memberships.organizationId, organizationId),
			),
		);
	return membership ?? null;
}
