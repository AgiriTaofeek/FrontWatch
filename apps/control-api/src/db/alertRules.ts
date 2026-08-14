import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { alertRules } from "./schema";

// The alert-evaluator's own read of alert_rules — separate from
// routes/alertRules.ts's CRUD queries (which serve the dashboard API)
// because this one has a fixed, evaluator-specific shape (only
// enabled new_issue rules, nothing paginated or filtered by an HTTP
// caller).
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
