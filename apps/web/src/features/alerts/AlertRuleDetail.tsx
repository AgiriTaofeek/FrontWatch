import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertEventList } from "./AlertEventList";
import { alertRuleQueryOptions } from "./api";

export function AlertRuleDetail({ ruleId }: { ruleId: string }) {
	const { data: rule } = useSuspenseQuery(alertRuleQueryOptions(ruleId));

	return (
		<div>
			<h1>{rule.webhookUrl}</h1>
			<dl>
				<dt>Type</dt>
				<dd>{rule.type}</dd>
				<dt>Status</dt>
				<dd>{rule.enabled ? "Enabled" : "Disabled"}</dd>
				<dt>Created</dt>
				<dd>{rule.createdAt}</dd>
			</dl>

			<h2>Fired alerts</h2>
			<AlertEventList ruleId={ruleId} />
		</div>
	);
}
