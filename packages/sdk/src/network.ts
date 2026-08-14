import { captureNetworkEvent } from "./client";

// Automatic capture of fetch requests. XHR instrumentation is
// deferred, not forgotten — fetch alone covers the modern-standard
// case; XHR needs prototype-patching with a materially different
// shape (open/send, not a single call), real separate work.
//
// instrumentation.md's hard requirement: "must never alter request/
// response/promise/error behavior" — this wrapper always calls the
// real fetch, always returns/throws exactly what it returned/threw,
// and only *observes* timing/outcome on the side.

const numericSegment = /^\d+$/;
const uuidSegment =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same normalization goal as the backend's fingerprint normalization
// (internal/issue/fingerprint.go) — different runtime/language, same
// underlying idea: strip dynamic values so /api/users/123 and
// /api/users/456 count as the same resource, not two high-cardinality
// ones. Also drops the query string entirely, same "never blindly
// capture query strings" rule instrumentation.md states for
// navigation.
export function normalizeResource(url: string, base: string): string {
	const { pathname } = new URL(url, base);
	return pathname
		.split("/")
		.map((segment) => {
			if (numericSegment.test(segment) || uuidSegment.test(segment)) {
				return ":id";
			}
			return segment;
		})
		.join("/");
}

export interface NetworkInstrumentationOptions {
	// The SDK's own transport target — requests to it are passed
	// through untouched, never captured. Without this, every telemetry
	// batch send would itself generate a "network event" about sending
	// network events: not infinite recursion (the captured event only
	// flushes on the *next* tick), but real, useless noise and volume.
	ignoreUrlPrefix: string;
}

export function registerNetworkInstrumentation(
	options: NetworkInstrumentationOptions,
): void {
	const originalFetch = window.fetch.bind(window);

	window.fetch = async (...args: Parameters<typeof fetch>) => {
		const request = new Request(...args);

		if (request.url.startsWith(options.ignoreUrlPrefix)) {
			return originalFetch(...args);
		}

		const start = performance.now();

		try {
			const response = await originalFetch(...args);
			captureNetworkEvent({
				method: request.method,
				resource: normalizeResource(request.url, window.location.href),
				status: response.status,
				durationMs: performance.now() - start,
				outcome: response.ok ? "success" : "failure",
			});
			return response;
		} catch (error) {
			captureNetworkEvent({
				method: request.method,
				resource: normalizeResource(request.url, window.location.href),
				status: 0,
				durationMs: performance.now() - start,
				outcome: "failure",
			});
			// Never swallow — the caller's own error handling must see
			// exactly what it would have without this wrapper installed.
			throw error;
		}
	};
}
