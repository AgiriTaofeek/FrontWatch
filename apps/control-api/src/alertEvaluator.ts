// Step 8's alert-evaluator (ADR-025: TypeScript, not Go — a low-
// frequency poll loop gets no benefit from Go's throughput profile,
// and everything it needs — Postgres write access, ClickHouse read
// access — already exists on this side). A script with its own poll
// loop, not an HTTP route: nothing calls this over the network, it
// runs continuously as its own process (same "one binary per concern"
// pattern services/data-plane's cmd/ingestion vs cmd/worker already
// established, just in TypeScript).
import { markAlertEventNotified, recordAlertEvent } from "./db/alertEvents";
import { listEnabledNewIssueRules } from "./db/alertRules";
import { listNewIssues } from "./db/issues";
import { deliverWebhook } from "./lib/webhook";

export interface EvaluationCycleResult {
	rulesEvaluated: number;
	issuesNotified: number;
}

// One pass: for every enabled new_issue rule, find issues that first
// appeared on or after the rule's own createdAt (so a rule created
// against a project with pre-existing issues doesn't spam-fire for
// all of them at once), record+dedupe via alert_events, and deliver a
// webhook for whichever ones are genuinely new this cycle. Exported
// directly (not just reachable via the process loop below) so it's
// testable as one unit without needing a real timer.
export async function runAlertEvaluationCycle(): Promise<EvaluationCycleResult> {
	const rules = await listEnabledNewIssueRules();
	let issuesNotified = 0;

	for (const rule of rules) {
		const newIssues = await listNewIssues(rule.projectId, rule.createdAt);

		for (const issue of newIssues) {
			// The dedup gate: if this (rule, fingerprint) pair was already
			// recorded by an earlier cycle, recordAlertEvent returns
			// undefined and this issue is skipped — it was already
			// evaluated, successfully or not, and must never fire twice.
			const event = await recordAlertEvent(rule.id, issue.fingerprint);
			if (!event) {
				continue;
			}

			const result = await deliverWebhook(rule.webhookUrl, {
				type: "new_issue",
				projectId: rule.projectId,
				ruleId: rule.id,
				issue,
				triggeredAt: new Date().toISOString(),
			});

			if (result.delivered) {
				await markAlertEventNotified(event.id);
			}
			issuesNotified++;
		}
	}

	return { rulesEvaluated: rules.length, issuesNotified };
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			resolve();
		});
	});
}

// operations.md: "shutdown must never hang indefinitely" — same
// discipline the Go binaries already follow (signal.NotifyContext),
// just via AbortController here. Aborting mid-sleep resolves
// immediately rather than waiting out the rest of the poll interval.
if (import.meta.main) {
	const pollIntervalMs = Number(
		process.env.ALERT_EVALUATOR_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS,
	);
	const controller = new AbortController();
	process.on("SIGINT", () => controller.abort());
	process.on("SIGTERM", () => controller.abort());

	console.log(`alert-evaluator polling every ${pollIntervalMs}ms`);

	while (!controller.signal.aborted) {
		try {
			const result = await runAlertEvaluationCycle();
			if (result.issuesNotified > 0) {
				console.log(
					`evaluated ${result.rulesEvaluated} rule(s), notified ${result.issuesNotified} new issue(s)`,
				);
			}
		} catch (err) {
			// A failed cycle (e.g. a transient Postgres/ClickHouse blip)
			// must not kill the whole process — the next poll tries again.
			console.error("alert evaluation cycle failed:", err);
		}

		if (controller.signal.aborted) {
			break;
		}
		await sleep(pollIntervalMs, controller.signal);
	}

	console.log("alert-evaluator shut down");
}
