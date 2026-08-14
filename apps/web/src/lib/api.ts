// Thin fetch wrapper — every feature's query layer goes through this,
// not raw fetch() scattered around. Vite only exposes env vars to the
// client bundle when prefixed VITE_.
const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export async function apiFetch<T>(path: string): Promise<T> {
	const response = await fetch(`${API_BASE_URL}/api/v1${path}`);

	if (!response.ok) {
		// ui-patterns.md §4: errors must be actionable, not a bare failure
		// — callers get a real status code to distinguish "not found"
		// from "server error" rather than one generic error state.
		throw new ApiError(`Request to ${path} failed`, response.status);
	}

	return response.json() as Promise<T>;
}
