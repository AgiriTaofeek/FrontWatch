// The control-api <-> web contract for the Environment API — same
// reasoning as applications.ts.

export type EnvironmentType =
	| "development"
	| "staging"
	| "production"
	| "custom";

export interface EnvironmentSummary {
	id: string;
	applicationId: string;
	name: string;
	type: EnvironmentType;
	status: "active" | "disabled";
	createdAt: string;
	updatedAt: string;
}

export interface ListEnvironmentsResponse {
	environments: EnvironmentSummary[];
}
