import { db } from "./client";
import { memberships, organizations, users } from "./schema";

export class DuplicateEmailError extends Error {
	constructor() {
		super("a user with this email already exists");
		this.name = "DuplicateEmailError";
	}
}

export interface RegisterOrganizationInput {
	organizationName: string;
	email: string;
	name: string;
	passwordHash: string;
}

export interface RegisteredPrincipal {
	organizationId: string;
	userId: string;
	membershipId: string;
}

// US-01.01: "creating an org makes the creator an Administrator" — one
// atomic transaction, not three separate inserts a caller (or a crash
// mid-request) could observe half-completed. A crash between
// "organization created" and "membership created" would otherwise
// leave an orphaned organization nobody can administer.
export async function registerOrganizationAndAdmin(
	input: RegisterOrganizationInput,
): Promise<RegisteredPrincipal> {
	return db.transaction(async (tx) => {
		const [organization] = await tx
			.insert(organizations)
			.values({ name: input.organizationName })
			.returning();
		if (!organization) {
			throw new Error("failed to create organization");
		}

		// onConflictDoNothing(), not a try/catch on the raw constraint
		// violation — same pattern releases.ts's own duplicate-version
		// handling already established. Throwing here rolls back the
		// whole transaction (Drizzle's default on an uncaught error
		// inside the callback), so a taken email never leaves an
		// orphaned organization behind.
		const [user] = await tx
			.insert(users)
			.values({
				email: input.email,
				name: input.name,
				passwordHash: input.passwordHash,
			})
			.onConflictDoNothing()
			.returning();
		if (!user) {
			throw new DuplicateEmailError();
		}

		const [membership] = await tx
			.insert(memberships)
			.values({
				organizationId: organization.id,
				userId: user.id,
				role: "administrator",
			})
			.returning();
		if (!membership) {
			throw new Error("failed to create membership");
		}

		return {
			organizationId: organization.id,
			userId: user.id,
			membershipId: membership.id,
		};
	});
}
