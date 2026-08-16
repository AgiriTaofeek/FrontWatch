import type { AuthenticatedPrincipal } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// Step 10's pilot readiness dry-run built the first real auth UI —
// control-api's routes/auth.ts and packages/contracts' AuthenticatedPrincipal
// already existed (Step 9), just never had a consumer.

// `retry: false` — a 401 here means "not logged in," a completely
// normal, expected state on first load, not a transient failure worth
// retrying. React Query's own default (3 retries with backoff) would
// otherwise make every anonymous page load wait several seconds before
// settling into the "not logged in" state.
export function currentPrincipalQueryOptions() {
	return queryOptions({
		queryKey: ["auth", "me"],
		queryFn: () => apiFetch<AuthenticatedPrincipal>("/auth/me"),
		retry: false,
	});
}

export interface RegisterInput {
	organizationName: string;
	email: string;
	name: string;
	password: string;
}

export interface RegisterResponse {
	organizationId: string;
	userId: string;
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
	return apiFetch<RegisterResponse>("/auth/register", {
		method: "POST",
		body: input,
	});
}

export interface LoginInput {
	email: string;
	password: string;
}

export interface LoginResponse {
	userId: string;
}

export function login(input: LoginInput): Promise<LoginResponse> {
	return apiFetch<LoginResponse>("/auth/login", {
		method: "POST",
		body: input,
	});
}

export function logout(): Promise<{ loggedOut: boolean }> {
	return apiFetch<{ loggedOut: boolean }>("/auth/logout", { method: "POST" });
}
