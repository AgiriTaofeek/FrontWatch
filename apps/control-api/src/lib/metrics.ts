import { Elysia } from "elysia";
import client from "prom-client";

// ADR-026: Prometheus text exposition format, prom-client (confirmed
// Bun-compatible before adopting it — pure JS, no peer deps).
//
// A dedicated Registry, not prom-client's shared global default one —
// found the hard way (real duplicate-registration crash) that
// control-api and the alert-evaluator (alertEvaluatorMetrics.ts, a
// separate real process in production) both calling
// collectDefaultMetrics() against the *same* global default registry
// blows up with "already been registered" the moment both modules
// happen to load into one process, which `bun test` does for every
// file in a single run even though they're never both running for
// real at once. A scoped Registry makes each module's metrics
// genuinely independent, matching what's actually true in production,
// instead of relying on "these two processes never share a runtime"
// as an unstated assumption a test run doesn't honor.
export const registry = new client.Registry();

// collectDefaultMetrics() adds process CPU/memory/event-loop-lag/GC
// metrics for free — observability.md's capacity-monitoring signals
// (CPU, memory) and "resource saturation" core signal, at zero extra
// instrumentation cost.
client.collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new client.Counter({
	name: "control_api_http_requests_total",
	help: "Total HTTP requests handled by control-api.",
	labelNames: ["route", "method", "status"] as const,
	registers: [registry],
});

const httpRequestDuration = new client.Histogram({
	name: "control_api_http_request_duration_seconds",
	help: "HTTP request duration in seconds.",
	labelNames: ["route", "method", "status"] as const,
	registers: [registry],
});

// Per-request start time, keyed by the Request object itself — not
// Elysia's `store` (shared app-wide state, would race across
// concurrent requests) and not a bare `(ctx as any).x` (loses type
// safety for no reason). Confirmed empirically that the same context
// object — and so the same `request` — flows through every lifecycle
// hook for one request.
const requestStartTimes = new WeakMap<Request, number>();

interface RecordableContext {
	request: Request;
	route: string;
	set: { status?: number | string };
}

function recordRequest(ctx: RecordableContext): void {
	const start = requestStartTimes.get(ctx.request);
	const elapsedSeconds =
		start !== undefined ? (performance.now() - start) / 1000 : 0;
	requestStartTimes.delete(ctx.request);

	const labels = {
		route: ctx.route,
		method: ctx.request.method,
		status: String(ctx.set.status ?? 200),
	};
	httpRequestsTotal.inc(labels);
	httpRequestDuration.observe(labels, elapsedSeconds);
}

// metricsPlugin wraps every route mounted anywhere in the app (Elysia
// lifecycle hooks registered on a parent instance apply to routes
// merged in via .use(), but ONLY once this plugin is marked
// .as("global") — confirmed empirically necessary: by default a
// plugin's hooks are scoped to its own routes even when merged into a
// parent) and exposes /metrics.
//
// onAfterHandle + onError, not onAfterResponse: confirmed empirically
// that onAfterResponse fires *after* .handle()'s returned promise has
// already resolved (fire-and-forget, so a /metrics scrape immediately
// following a request could race ahead of it being recorded) — a real
// risk for anything scraping right after triggering traffic, tests
// included. onAfterHandle is synchronous and part of the actual
// response pipeline, but only runs on the success path; a thrown
// error or failed validation skips it entirely and goes straight to
// onError instead (confirmed empirically too), so both are needed to
// cover every response this service can produce.
//
// Mounted on the unprefixed root app, same reasoning as
// lib/health.ts's healthRoutes — /metrics must not become
// /api/v1/metrics.
//
// Labeled by `route` — Elysia's own matched route *pattern*
// (`/projects/:id/issues`), never the resolved path — operations.md's
// explicit caution against high-cardinality metric labels (arbitrary
// IDs, full URLs) is enforced by construction, the same as the Go
// services' InstrumentHandler.
export function metricsPlugin() {
	return new Elysia()
		.onRequest(({ request }) => {
			requestStartTimes.set(request, performance.now());
		})
		.onAfterHandle((ctx) => recordRequest(ctx))
		.onError((ctx) => recordRequest(ctx))
		.as("global")
		.get("/metrics", async ({ set }) => {
			set.headers["Content-Type"] = registry.contentType;
			return registry.metrics();
		});
}
