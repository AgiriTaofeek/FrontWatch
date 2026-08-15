// Query latency load test — operations.md's Load testing spec's
// "query latency" and "query concurrency" variables, against
// control-api's real investigation endpoints (ADR-010: query
// architecture follows investigation workflows). Meant to run *while*
// loadtest/scenarios/sustained-ingest.js applies background write
// pressure (see run.sh) — test-strategy.md's own reasoning for why
// that matters: "monitoring platforms tend to experience their own
// traffic spikes exactly when customer applications are failing,
// which is the worst possible time to discover a capacity problem."
// Run alone, this only measures read-path latency in isolation, which
// is a real number but not the one that matters most.
import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = __ENV.CONTROL_API_URL || "http://localhost:3000";
const PROJECT_ID = __ENV.PROJECT_ID;
const SESSION_COOKIE = __ENV.SESSION_COOKIE;
if (!PROJECT_ID || !SESSION_COOKIE) {
	throw new Error(
		"PROJECT_ID and SESSION_COOKIE env vars are required — run provision.sh and source loadtest/.session first",
	);
}

const ENDPOINTS = ["issues", "network", "sessions", "performance", "releases"];

export const options = {
	scenarios: {
		query_concurrency: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "10s", target: 5 }, // warm-up
				{ duration: "30s", target: 20 }, // normal dashboard traffic
				{ duration: "30s", target: 50 }, // peak — several engineers investigating at once
				{ duration: "15s", target: 5 }, // recovery
			],
			gracefulRampDown: "5s",
		},
	},
	thresholds: {
		http_req_failed: ["rate<0.01"],
		// Query latency budget is tighter than ingestion's — a real
		// investigation is interactive, not fire-and-forget.
		http_req_duration: ["p(95)<300"],
	},
};

export default function () {
	const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
	const res = http.get(
		`${BASE_URL}/api/v1/projects/${PROJECT_ID}/${endpoint}`,
		{ headers: { Cookie: `fw_session=${SESSION_COOKIE}` } },
	);

	check(res, { "status is 200": (r) => r.status === 200 });

	sleep(Math.random() * 0.3);
}
