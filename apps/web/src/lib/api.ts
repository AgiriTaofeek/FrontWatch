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

export interface ApiFetchOptions {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
}

// Step 8's alert rules feature is the dashboard's first mutation
// (every feature before this one was read-only display) — method/body
// added here rather than a second wrapper, so every feature keeps
// going through one fetch path. Defaulting `options` keeps every
// existing `apiFetch<T>(path)` call site unchanged.
export async function apiFetch<T>(
	path: string,
	options: ApiFetchOptions = {},
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
		method: options.method,
		headers:
			options.body !== undefined
				? { "Content-Type": "application/json" }
				: undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		// ui-patterns.md §4: errors must be actionable, not a bare failure
		// — callers get a real status code to distinguish "not found"
		// from "server error" rather than one generic error state.
		throw new ApiError(`Request to ${path} failed`, response.status);
	}

	return response.json() as Promise<T>;
}
