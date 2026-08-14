// The alert-evaluator's notification delivery — a plain POST of a JSON
// payload to a user-configured URL (ADR-025 context: the simplest real
// delivery mechanism, no external service credentials needed).
//
// Deliberately no retry logic in this slice: a failed delivery still
// leaves its alert_events row recorded (db/alertEvents.ts), so the
// same issue is never re-notified on the next poll even though this
// attempt didn't succeed — a real retry/backoff policy is separate,
// deferred work, not silently skipped. Bounded timeout so one slow or
// hanging endpoint can't stall the whole evaluation cycle.
const WEBHOOK_TIMEOUT_MS = 5000;

export interface WebhookDeliveryResult {
	delivered: boolean;
	status?: number;
}

export async function deliverWebhook(
	url: string,
	payload: unknown,
): Promise<WebhookDeliveryResult> {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
		});

		return { delivered: response.ok, status: response.status };
	} catch {
		// Network failure, DNS failure, or the timeout above firing — all
		// the same outcome from the caller's perspective: this delivery
		// didn't happen. The specific error isn't surfaced anywhere yet
		// (no alerting-on-alerting exists) — a real gap, tracked, not
		// silently swallowed forever.
		return { delivered: false };
	}
}
