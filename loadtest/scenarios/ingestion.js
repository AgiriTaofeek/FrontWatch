// Ingestion throughput/latency load test — operations.md's Load
// testing spec: "ingestion throughput, processing throughput, query
// latency, queue lag, storage insert performance." This scenario
// covers the first one directly; queue lag and processing/storage
// throughput are read separately (see loadtest/run.sh, which checks
// `rpk group describe` and a ClickHouse row count immediately after
// this run finishes).
//
// Stage shape follows test-strategy.md's own load-testing section
// verbatim: "normal traffic, peak traffic, incident spike, sustained
// high volume, and recovery after a spike" — not an arbitrary ramp.
// VU counts are sized for one laptop running Postgres + ClickHouse +
// Redpanda + both Go binaries + control-api all colocated (see
// loadtest/README.md's caveat) — a real deployment with these on
// separate hosts would sustain higher numbers before the same
// saturation point.
//
// Also deliberately sized against a real finding this test itself
// produced: cmd/worker processes one record at a time (one ClickHouse
// insert + one Kafka commit per event, by design — see its own
// comment on why), which caps steady-state processing at roughly
// 200-250 events/sec (measured via worker_processing_duration_seconds
// — see PROGRESS.md's Step 9 Load testing entry). An earlier version
// of this scenario ran at 150 peak VUs and produced a 200k+ event
// backlog that took over 15 minutes to drain — correct as a one-off
// capacity-finding run, but a bad default for a script meant to be run
// routinely. These stage targets keep the same qualitative shape
// (the spike still comfortably outruns processing) while keeping
// run.sh's post-test drain wait in the low minutes, not tens of them.
import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.INGESTION_URL || "http://localhost:8080";
const PUBLIC_KEY = __ENV.PUBLIC_KEY;
if (!PUBLIC_KEY) {
	throw new Error(
		"PUBLIC_KEY env var is required — run provision.sh and source loadtest/.session first",
	);
}

const eventsAccepted = new Counter("fw_events_accepted");
const eventsRejected = new Counter("fw_events_rejected");
const batchSuccess = new Rate("fw_batch_success");

const ROUTES = ["/dashboard", "/checkout", "/settings", "/orders/:id", "/"];
const RELEASES = ["1.0.0", "1.1.0", "1.2.0"];
const METRICS = ["LCP", "CLS", "INP", "FCP", "TTFB"];

function pick(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function randomEvent() {
	const type = pick(["error", "network", "performance"]);
	const base = {
		event_id: `evt_lt_${__VU}_${__ITER}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		event_type: type,
		schema_version: 1,
		timestamp: new Date().toISOString(),
		release: pick(RELEASES),
		session_id: `sess_lt_${__VU}`,
		route: pick(ROUTES),
	};

	if (type === "error") {
		return {
			...base,
			payload: {
				message: "Unexpected token in JSON at position 0",
				exception_type: "SyntaxError",
				stack_trace: "at parse (app.js:42:10)\nat load (app.js:10:4)",
				handled: false,
			},
		};
	}
	if (type === "network") {
		const failed = Math.random() < 0.1;
		return {
			...base,
			payload: {
				method: pick(["GET", "POST"]),
				resource: "/api/orders/:id",
				status: failed ? 500 : 200,
				duration_ms: Math.round(Math.random() * 800),
				outcome: failed ? "failure" : "success",
			},
		};
	}
	return {
		...base,
		payload: {
			metric_name: pick(METRICS),
			value: Math.round(Math.random() * 3000 * 100) / 100,
			rating: pick(["good", "needs-improvement", "poor"]),
			navigation_type: "navigate",
		},
	};
}

const BATCH_MIN = Number(__ENV.BATCH_MIN || 1);
const BATCH_MAX = Number(__ENV.BATCH_MAX || 10);

export const options = {
	scenarios: {
		traffic_pattern: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "15s", target: 5 }, // warm-up
				{ duration: "25s", target: 10 }, // normal traffic
				{ duration: "25s", target: 20 }, // peak traffic
				{ duration: "15s", target: 45 }, // incident spike
				{ duration: "30s", target: 20 }, // sustained high volume
				{ duration: "15s", target: 3 }, // recovery
			],
			gracefulRampDown: "10s",
		},
	},
	thresholds: {
		http_req_failed: ["rate<0.01"],
		http_req_duration: ["p(95)<1000"],
		fw_batch_success: ["rate>0.99"],
	},
};

export default function () {
	const batchSize =
		Math.floor(Math.random() * (BATCH_MAX - BATCH_MIN + 1)) + BATCH_MIN;
	const events = Array.from({ length: batchSize }, randomEvent);
	const body = JSON.stringify({
		schema_version: 1,
		sent_at: new Date().toISOString(),
		events,
	});

	const res = http.post(`${BASE_URL}/ingest/v1/events`, body, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${PUBLIC_KEY}`,
		},
	});

	const ok = check(res, { "status is 200": (r) => r.status === 200 });
	batchSuccess.add(ok);
	if (ok) {
		const parsed = res.json();
		eventsAccepted.add(parsed.accepted);
		eventsRejected.add(parsed.rejected);
	}

	sleep(Math.random() * 0.5);
}
