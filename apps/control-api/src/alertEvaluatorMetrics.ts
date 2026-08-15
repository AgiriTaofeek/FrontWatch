import client from "prom-client";

// ADR-026's alert-evaluator slice — its own /metrics, separate from
// control-api's HTTP-request metrics (lib/metrics.ts) since it's a
// genuinely different kind of service: a poll loop, not an HTTP API.
// Reuses lib/health.ts's generic healthRoutes for /health/live +
// /health/ready (wired up in alertEvaluator.ts itself), but needs its
// own metric names — "cycles run", "rules evaluated", "notifications
// sent" describe this process, not HTTP request/response shapes.
//
// A dedicated Registry, not prom-client's shared global default one —
// same reasoning as lib/metrics.ts's own registry: this and
// control-api are separate real OS processes in production, but both
// modules load into one shared process during `bun test`, and two
// calls to collectDefaultMetrics() against the same global registry
// throw a real "already been registered" error the moment that
// happens.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const cyclesRunTotal = new client.Counter({
	name: "alert_evaluator_cycles_run_total",
	help: "Total alert evaluation cycles run.",
	registers: [registry],
});

export const rulesEvaluatedTotal = new client.Counter({
	name: "alert_evaluator_rules_evaluated_total",
	help: "Total alert rules evaluated, across all cycles and types.",
	registers: [registry],
});

// One counter, labeled by type, not three separate counters — the
// three alert types (new_issue/error_spike/performance_regression)
// are a small fixed set, not a high-cardinality label.
export const notificationsSentTotal = new client.Counter({
	name: "alert_evaluator_notifications_sent_total",
	help: "Total notifications sent, by alert type.",
	labelNames: ["type"] as const,
	registers: [registry],
});

export const cycleDuration = new client.Histogram({
	name: "alert_evaluator_cycle_duration_seconds",
	help: "Time to run one full evaluation cycle (all rules, all types).",
	registers: [registry],
});
