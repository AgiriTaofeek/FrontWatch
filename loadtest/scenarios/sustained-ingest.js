// Flat, sustained background write load — run.sh starts this
// alongside query.js so query latency is measured under real
// concurrent ingestion pressure, not in isolation (see query.js's own
// comment for why that's the case that matters). Deliberately simpler
// than ingestion.js's staged ramp: a constant rate is the right model
// for "background load while something else is being measured," not
// another traffic-pattern test in its own right.
import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.INGESTION_URL || "http://localhost:8080";
const PUBLIC_KEY = __ENV.PUBLIC_KEY;
if (!PUBLIC_KEY) {
	throw new Error(
		"PUBLIC_KEY env var is required — run provision.sh and source loadtest/.session first",
	);
}
const DURATION = __ENV.DURATION || "90s";
const VUS = Number(__ENV.VUS || 15);

// run.sh's final drain-wait/processing-correctness check needs the
// *total* accepted count (ingestion.js's own run plus this background
// run), not just ingestion.js's — this scenario overlaps query.js in
// time and writes to the same project.
const eventsAccepted = new Counter("fw_events_accepted");

export const options = {
	scenarios: {
		background_writes: {
			executor: "constant-vus",
			vus: VUS,
			duration: DURATION,
		},
	},
};

export default function () {
	const body = JSON.stringify({
		schema_version: 1,
		sent_at: new Date().toISOString(),
		events: [
			{
				event_id: `evt_lt_bg_${__VU}_${__ITER}_${Date.now()}`,
				event_type: "performance",
				schema_version: 1,
				timestamp: new Date().toISOString(),
				release: "1.0.0",
				session_id: `sess_lt_bg_${__VU}`,
				route: "/dashboard",
				payload: {
					metric_name: "LCP",
					value: Math.round(Math.random() * 3000),
					rating: "good",
					navigation_type: "navigate",
				},
			},
		],
	});

	const res = http.post(`${BASE_URL}/ingest/v1/events`, body, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${PUBLIC_KEY}`,
		},
	});

	if (res.status === 200) {
		eventsAccepted.add(res.json().accepted);
	}

	sleep(0.3);
}
