import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { alertRules } from "./schema";

// The alert-evaluator's own reads of alert_rules — separate from
// routes/alertRules.ts's CRUD queries (which serve the dashboard API)
// because these have a fixed, evaluator-specific shape (only enabled
// rules of one type, nothing paginated or filtered by an HTTP caller).
// One function per type rather than one generic query: each type's
// condition columns are genuinely required once you know the type
// (enforced at insert time by the discriminated request body,
// routes/alertRules.ts), so returning them as non-nullable numbers/
// strings here — instead of pushing every caller to null-check columns
// that are only nullable because Postgres has one shared table for all
// three types — matches what's actually true once `type` is known.

function requireNonNull<T>(value: T | null, field: string): T {
	if (value === null) {
		throw new Error(
			`alert rule condition column "${field}" was null for a rule whose type requires it — data integrity bug, not an expected state`,
		);
	}
	return value;
}

export interface EnabledNewIssueRule {
	id: string;
	projectId: string;
	webhookUrl: string;
	createdAt: Date;
}

export async function listEnabledNewIssueRules(): Promise<
	EnabledNewIssueRule[]
> {
	const rows = await db
		.select({
			id: alertRules.id,
			projectId: alertRules.projectId,
			webhookUrl: alertRules.webhookUrl,
			createdAt: alertRules.createdAt,
		})
		.from(alertRules)
		.where(and(eq(alertRules.enabled, true), eq(alertRules.type, "new_issue")));

	return rows;
}

export interface EnabledErrorSpikeRule {
	id: string;
	projectId: string;
	webhookUrl: string;
	windowMinutes: number;
	thresholdCount: number;
}

export async function listEnabledErrorSpikeRules(): Promise<
	EnabledErrorSpikeRule[]
> {
	const rows = await db
		.select({
			id: alertRules.id,
			projectId: alertRules.projectId,
			webhookUrl: alertRules.webhookUrl,
			windowMinutes: alertRules.windowMinutes,
			thresholdCount: alertRules.thresholdCount,
		})
		.from(alertRules)
		.where(
			and(eq(alertRules.enabled, true), eq(alertRules.type, "error_spike")),
		);

	return rows.map((row) => ({
		id: row.id,
		projectId: row.projectId,
		webhookUrl: row.webhookUrl,
		windowMinutes: requireNonNull(row.windowMinutes, "window_minutes"),
		thresholdCount: requireNonNull(row.thresholdCount, "threshold_count"),
	}));
}

export interface EnabledPerformanceRegressionRule {
	id: string;
	projectId: string;
	webhookUrl: string;
	windowMinutes: number;
	metricName: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
	thresholdValue: number;
}

export async function listEnabledPerformanceRegressionRules(): Promise<
	EnabledPerformanceRegressionRule[]
> {
	const rows = await db
		.select({
			id: alertRules.id,
			projectId: alertRules.projectId,
			webhookUrl: alertRules.webhookUrl,
			windowMinutes: alertRules.windowMinutes,
			metricName: alertRules.metricName,
			thresholdValue: alertRules.thresholdValue,
		})
		.from(alertRules)
		.where(
			and(
				eq(alertRules.enabled, true),
				eq(alertRules.type, "performance_regression"),
			),
		);

	return rows.map((row) => ({
		id: row.id,
		projectId: row.projectId,
		webhookUrl: row.webhookUrl,
		windowMinutes: requireNonNull(row.windowMinutes, "window_minutes"),
		metricName: requireNonNull(row.metricName, "metric_name"),
		thresholdValue: requireNonNull(row.thresholdValue, "threshold_value"),
	}));
}
