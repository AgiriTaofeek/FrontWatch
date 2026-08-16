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
		// Pilot readiness dry-run (Step 10, PROGRESS.md) found this
		// missing entirely — without it, the browser never sends the
		// fw_session cookie back to control-api on a cross-origin
		// request (the dashboard and control-api run on different
		// origins/ports even in this same local setup), so every
		// protected route 401'd regardless of whether a login screen
		// existed. control-api's own CORS config (lib/cors.ts) has to
		// echo the specific origin (not "*") and set
		// Access-Control-Allow-Credentials for this to actually work —
		// the two changes only work together.
		credentials: "include",
		headers:
			options.body !== undefined
				? { "Content-Type": "application/json" }
				: undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		// ui-patterns.md §4: errors must be actionable, not a bare failure
		// — callers get a real status code to distinguish "not found"
		// from "server error" rather than one generic error state. Also
		// surfaces the server's own error message (e.g. "invalid email
		// or password") when the response body has one, rather than
		// always showing a generic "request failed" — real UX need,
		// found while building the login form (Step 10).
		let message = `Request to ${path} failed`;
		try {
			const body = (await response.json()) as { error?: string };
			if (body?.error) {
				message = body.error;
			}
		} catch {
			// Response body wasn't JSON (or was empty) — keep the generic
			// message rather than letting a parse error mask the real one.
		}
		throw new ApiError(message, response.status);
	}

	return response.json() as Promise<T>;
}
