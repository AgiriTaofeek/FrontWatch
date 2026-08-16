// The control-api <-> web contract for the Application API — same
// reasoning as issues.ts/network.ts: apps/control-api defines these
// shapes by returning them, apps/web consumes the same types instead
// of a separately hand-maintained copy that could drift.

export interface ApplicationSummary {
	id: string;
	organizationId: string;
	name: string;
	framework: string | null;
	status: "active" | "disabled";
	createdAt: string;
	updatedAt: string;
}

export interface ListApplicationsResponse {
	applications: ApplicationSummary[];
}
