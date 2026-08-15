// The control-api <-> web contract for auth (Step 9, ADR-027) — same
// reasoning as every other packages/contracts file: control-api
// defines these shapes by returning them, apps/web consumes the same
// types instead of a separately hand-maintained copy that could
// drift.

export type MembershipRole = "administrator" | "engineer" | "viewer";

export interface OrganizationMembershipSummary {
	membershipId: string;
	role: MembershipRole;
	organizationId: string;
	organizationName: string;
}

// GET /api/v1/auth/me's response shape — "who is currently
// authenticated, and which organizations can they act in, with what
// role." memberships is a list, not a single org: a user can belong
// to more than one organization (data-model.md's Membership join
// table), even though this slice's dashboard doesn't yet build an
// org-switcher UI for it.
export interface AuthenticatedPrincipal {
	userId: string;
	email: string;
	name: string;
	memberships: OrganizationMembershipSummary[];
}
