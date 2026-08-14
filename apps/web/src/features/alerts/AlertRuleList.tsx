import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	alertRulesQueryOptions,
	createAlertRule,
	setAlertRuleEnabled,
} from "./api";

// The dashboard's first mutation UI — US-13.01: "an authorized user
// can create a rule ... rules can be enabled or disabled." Only
// `new_issue` exists yet (Step 8's first Alerting slice), so there's
// no condition picker — creating a rule is just "give it a webhook."
export function AlertRuleList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(alertRulesQueryOptions(projectId));
	const queryClient = useQueryClient();
	const [webhookUrl, setWebhookUrl] = useState("");

	const createMutation = useMutation({
		mutationFn: (url: string) => createAlertRule(projectId, url),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: alertRulesQueryOptions(projectId).queryKey,
			});
			setWebhookUrl("");
		},
	});

	const toggleMutation = useMutation({
		mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
			setAlertRuleEnabled(projectId, ruleId, enabled),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: alertRulesQueryOptions(projectId).queryKey,
			});
		},
	});

	return (
		<div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					const trimmed = webhookUrl.trim();
					if (trimmed) {
						createMutation.mutate(trimmed);
					}
				}}
			>
				<label htmlFor="webhookUrl">Webhook URL</label>
				<input
					id="webhookUrl"
					type="url"
					value={webhookUrl}
					onChange={(event) => setWebhookUrl(event.target.value)}
					placeholder="https://example.com/hooks/frontwatch"
					required
				/>
				<button type="submit" disabled={createMutation.isPending}>
					Create alert rule
				</button>
				{createMutation.isError && (
					// ui-patterns.md §4: errors must be actionable — the most
					// likely real cause is control-api's own format:"uri"
					// rejection (routes/alertRules.ts), named directly rather
					// than a bare "something went wrong."
					<p role="alert">
						Could not create the rule — check that the webhook URL is valid.
					</p>
				)}
			</form>

			{data.alertRules.length === 0 ? (
				<p>No alert rules configured for this project.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Type</th>
							<th>Webhook</th>
							<th>Status</th>
							<th>Created</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{data.alertRules.map((rule) => (
							<tr key={rule.id}>
								<td>{rule.type}</td>
								<td>
									<Link to="/alert-rules/$ruleId" params={{ ruleId: rule.id }}>
										{rule.webhookUrl}
									</Link>
								</td>
								<td>{rule.enabled ? "Enabled" : "Disabled"}</td>
								<td>{rule.createdAt}</td>
								<td>
									<button
										type="button"
										onClick={() =>
											toggleMutation.mutate({
												ruleId: rule.id,
												enabled: !rule.enabled,
											})
										}
										disabled={toggleMutation.isPending}
									>
										{rule.enabled ? "Disable" : "Enable"}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
