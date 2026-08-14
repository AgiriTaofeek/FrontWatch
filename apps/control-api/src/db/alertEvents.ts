import { eq } from "drizzle-orm";
import { db } from "./client";
import { alertEvents } from "./schema";

// The alert-evaluator's dedup mechanism (US-13.02: "repeated
// evaluations do not create uncontrolled duplicate notifications").
// onConflictDoNothing() against alert_events' unique(alert_rule_id,
// fingerprint) constraint (schema.ts) makes "have we already alerted
// on this issue for this rule" an atomic database guarantee, not a
// check-then-insert race — two evaluator instances running the same
// poll cycle concurrently can't both insert for the same issue.
//
// Returns the inserted row, or undefined if the constraint already
// existed — the caller uses that to decide whether this is genuinely
// new (only insert a webhook delivery attempt for a row that was
// actually just created).
export async function recordAlertEvent(
	alertRuleId: string,
	fingerprint: string,
): Promise<{ id: string } | undefined> {
	const [event] = await db
		.insert(alertEvents)
		.values({ alertRuleId, fingerprint })
		.onConflictDoNothing()
		.returning({ id: alertEvents.id });

	return event;
}

// Marks a recorded event as actually delivered — kept separate from
// recordAlertEvent so a webhook failure still leaves the dedup record
// in place (never re-fires on the next poll for the same issue) while
// staying distinguishable from a real, successful delivery.
export async function markAlertEventNotified(
	alertEventId: string,
): Promise<void> {
	await db
		.update(alertEvents)
		.set({ notifiedAt: new Date() })
		.where(eq(alertEvents.id, alertEventId));
}
