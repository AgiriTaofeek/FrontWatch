import { useSuspenseQuery } from "@tanstack/react-query";
import { alertEventsQueryOptions } from "./api";

// alert-investigation.md's "related issues" for an alert rule — the
// fingerprints this rule has actually fired on, not just its
// configuration. notifiedAt distinguishes a delivered webhook from a
// recorded-but-failed one (lib/webhook.ts's deliverWebhook doesn't
// retry this slice — a dash here means the dedup fired but delivery
// itself didn't succeed, worth being visible rather than silent).
export function AlertEventList({ ruleId }: { ruleId: string }) {
	const { data } = useSuspenseQuery(alertEventsQueryOptions(ruleId));

	if (data.alertEvents.length === 0) {
		return <p>No alerts have fired for this rule yet.</p>;
	}

	return (
		<table>
			<thead>
				<tr>
					<th>Fingerprint</th>
					<th>State</th>
					<th>Triggered</th>
					<th>Notified</th>
				</tr>
			</thead>
			<tbody>
				{data.alertEvents.map((event) => (
					<tr key={event.id}>
						<td>{event.fingerprint}</td>
						<td>{event.state}</td>
						<td>{event.triggeredAt}</td>
						<td>{event.notifiedAt ?? "—"}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
