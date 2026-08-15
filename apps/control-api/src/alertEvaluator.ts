// Step 8's alert-evaluator (ADR-025: TypeScript, not Go — a low-
// frequency poll loop gets no benefit from Go's throughput profile,
// and everything it needs — Postgres write access, ClickHouse read
// access — already exists on this side). A script with its own poll
// loop, not an HTTP route: nothing calls this over the network, it
// runs continuously as its own process (same "one binary per concern"
// pattern services/data-plane's cmd/ingestion vs cmd/worker already
// established, just in TypeScript).
import { markAlertEventNotified, recordAlertEvent } from "./db/alertEvents";
import {
	listEnabledErrorSpikeRules,
	listEnabledNewIssueRules,
	listEnabledPerformanceRegressionRules,
} from "./db/alertRules";
import { countRecentErrors, listNewIssues } from "./db/issues";
import { getRecentMetricWindow } from "./db/performance";
import { deliverWebhook } from "./lib/webhook";

export interface EvaluationCycleResult {
	rulesEvaluated: number;
	issuesNotified: number;
	errorSpikesNotified: number;
	performanceRegressionsNotified: number;
}

// error_spike/performance_regression are threshold-over-a-window
// conditions (US-13.02/13.03), not "is this specific thing new"
// (US-13.01) — the same underlying condition can legitimately still be
// true on the very next poll (a sustained spike), so a per-issue
// fingerprint doesn't apply. Instead: bucket time itself into
// non-overlapping windowMinutes-sized slices and fingerprint by which
// slice `now` falls in. Every poll within the same slice computes the
// same fingerprint, so alert_events' existing unique(alert_rule_id,
// fingerprint) dedup constraint (db/alertEvents.ts) still gives one
// notification per slice with zero new schema or state tracking — and
// a still-ongoing incident that crosses into the next slice correctly
// notifies again, rather than going silent after the first firing.
function windowBucketFingerprint(
	prefix: string,
	windowMinutes: number,
	now: Date,
): string {
	const windowMs = windowMinutes * 60_000;
	const bucketIndex = Math.floor(now.getTime() / windowMs);
	return `${prefix}:${windowMinutes}:${bucketIndex}`;
}

async function evaluateNewIssueRules(): Promise<{
	rulesEvaluated: number;
	issuesNotified: number;
}> {
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

async function evaluateErrorSpikeRules(now: Date): Promise<{
	rulesEvaluated: number;
	errorSpikesNotified: number;
}> {
	const rules = await listEnabledErrorSpikeRules();
	let errorSpikesNotified = 0;

	for (const rule of rules) {
		const since = new Date(now.getTime() - rule.windowMinutes * 60_000);
		const errorCount = await countRecentErrors(rule.projectId, since);

		if (errorCount < rule.thresholdCount) {
			continue;
		}

		const fingerprint = windowBucketFingerprint(
			"error_spike",
			rule.windowMinutes,
			now,
		);
		const event = await recordAlertEvent(rule.id, fingerprint);
		if (!event) {
			continue;
		}

		const result = await deliverWebhook(rule.webhookUrl, {
			type: "error_spike",
			projectId: rule.projectId,
			ruleId: rule.id,
			errorCount,
			thresholdCount: rule.thresholdCount,
			windowMinutes: rule.windowMinutes,
			windowStart: since.toISOString(),
			triggeredAt: now.toISOString(),
		});

		if (result.delivered) {
			await markAlertEventNotified(event.id);
		}
		errorSpikesNotified++;
	}

	return { rulesEvaluated: rules.length, errorSpikesNotified };
}

async function evaluatePerformanceRegressionRules(now: Date): Promise<{
	rulesEvaluated: number;
	performanceRegressionsNotified: number;
}> {
	const rules = await listEnabledPerformanceRegressionRules();
	let performanceRegressionsNotified = 0;

	for (const rule of rules) {
		const since = new Date(now.getTime() - rule.windowMinutes * 60_000);
		const window = await getRecentMetricWindow(
			rule.projectId,
			rule.metricName,
			since,
		);

		if (!window || window.p75Value < rule.thresholdValue) {
			continue;
		}

		const fingerprint = windowBucketFingerprint(
			`performance_regression:${rule.metricName}`,
			rule.windowMinutes,
			now,
		);
		const event = await recordAlertEvent(rule.id, fingerprint);
		if (!event) {
			continue;
		}

		const result = await deliverWebhook(rule.webhookUrl, {
			type: "performance_regression",
			projectId: rule.projectId,
			ruleId: rule.id,
			metricName: rule.metricName,
			p75Value: window.p75Value,
			thresholdValue: rule.thresholdValue,
			windowMinutes: rule.windowMinutes,
			// US-13.03: "notifications include relevant route/release
			// context where available" — null, not omitted, when the
			// window genuinely has no route/release data yet.
			latestRelease: window.latestRelease,
			latestRoute: window.latestRoute,
			triggeredAt: now.toISOString(),
		});

		if (result.delivered) {
			await markAlertEventNotified(event.id);
		}
		performanceRegressionsNotified++;
	}

	return { rulesEvaluated: rules.length, performanceRegressionsNotified };
}

// One pass across all three alert types. `now` is a parameter (not
// read fresh internally per type) so a single cycle evaluates every
// rule against the exact same instant — otherwise two error_spike
// rules with the same windowMinutes could land in different time
// buckets purely from evaluation order, an artificial inconsistency
// with no real meaning. Exported directly (not just reachable via the
// process loop below) so it's testable as one unit without needing a
// real timer.
export async function runAlertEvaluationCycle(
	now: Date = new Date(),
): Promise<EvaluationCycleResult> {
	const newIssueResult = await evaluateNewIssueRules();
	const errorSpikeResult = await evaluateErrorSpikeRules(now);
	const performanceRegressionResult =
		await evaluatePerformanceRegressionRules(now);

	return {
		rulesEvaluated:
			newIssueResult.rulesEvaluated +
			errorSpikeResult.rulesEvaluated +
			performanceRegressionResult.rulesEvaluated,
		issuesNotified: newIssueResult.issuesNotified,
		errorSpikesNotified: errorSpikeResult.errorSpikesNotified,
		performanceRegressionsNotified:
			performanceRegressionResult.performanceRegressionsNotified,
	};
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
			const totalNotified =
				result.issuesNotified +
				result.errorSpikesNotified +
				result.performanceRegressionsNotified;
			if (totalNotified > 0) {
				console.log(
					`evaluated ${result.rulesEvaluated} rule(s): ${result.issuesNotified} new issue(s), ${result.errorSpikesNotified} error spike(s), ${result.performanceRegressionsNotified} performance regression(s) notified`,
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
