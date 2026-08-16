import { cors } from "@elysiajs/cors";

// Pilot readiness dry-run (Step 10, PROGRESS.md) found the dashboard
// (apps/web) could never actually reach a protected route through a
// real browser — the fw_session cookie only round-trips on a
// cross-origin request if BOTH sides opt in: the client sends
// `credentials: "include"` (apps/web/src/lib/api.ts) AND the server
// echoes back the caller's specific origin (never "*" — the Fetch
// spec forbids a wildcard alongside credentialed requests) plus
// `Access-Control-Allow-Credentials: true`. Neither side fixes this
// alone.
//
// WEB_ORIGIN is a comma-separated allowlist, not "allow everything" —
// a self-hosted deployment's dashboard runs on a specific origin the
// operator controls, matching infrastructure.md's "only Web/API and
// Ingestion are normally exposed" model; there's no reason a random
// third-party origin should ever be allowed to make a credentialed
// request against a customer's own telemetry.
const DEFAULT_WEB_ORIGIN = "http://localhost:3001";

export function corsPlugin() {
	const origins = (process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN)
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);

	return cors({
		origin: origins,
		credentials: true,
	});
}
