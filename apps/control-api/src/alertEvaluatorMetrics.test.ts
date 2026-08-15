import { describe, expect, it } from "bun:test";
import {
	cycleDuration,
	cyclesRunTotal,
	notificationsSentTotal,
	registry,
	rulesEvaluatedTotal,
} from "./alertEvaluatorMetrics";

// Confirms the counters actually write to *this module's own*
// registry, not prom-client's shared global default one — the real
// bug ADR-026 documents finding (two services' collectDefaultMetrics()
// calls colliding the moment both modules load into one process,
// exactly what a shared-process test run like this one does).
describe("alertEvaluatorMetrics", () => {
	it("records cycle/rule/notification counters onto the module's dedicated registry", async () => {
		cyclesRunTotal.inc();
		rulesEvaluatedTotal.inc(3);
		notificationsSentTotal.inc({ type: "new_issue" }, 2);
		notificationsSentTotal.inc({ type: "error_spike" }, 1);
		cycleDuration.observe(0.05);

		const body = await registry.metrics();

		expect(body).toContain("alert_evaluator_cycles_run_total 1");
		expect(body).toContain("alert_evaluator_rules_evaluated_total 3");
		expect(body).toContain(
			'alert_evaluator_notifications_sent_total{type="new_issue"} 2',
		);
		expect(body).toContain(
			'alert_evaluator_notifications_sent_total{type="error_spike"} 1',
		);
		expect(body).toContain("alert_evaluator_cycle_duration_seconds_count 1");
		// The default process metrics (collectDefaultMetrics) too, not
		// just the four defined in this module.
		expect(body).toContain("process_cpu_user_seconds_total");
	});
});
