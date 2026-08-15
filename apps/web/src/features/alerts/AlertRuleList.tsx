import type { AlertMetricName, AlertRuleType } from "@frontwatch/contracts";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	ALERT_METRIC_NAMES,
	ALERT_RULE_TYPES,
	alertRulesQueryOptions,
	type CreateAlertRuleInput,
	createAlertRule,
	describeAlertCondition,
	setAlertRuleEnabled,
} from "./api";

const DEFAULT_WINDOW_MINUTES = "10";
const DEFAULT_THRESHOLD_COUNT = "10";
const DEFAULT_METRIC_NAME: AlertMetricName = "LCP";
const DEFAULT_THRESHOLD_VALUE = "2500";

// US-13.01: "an authorized user can create a rule ... the rule has a
// condition ... rules can be enabled or disabled." All three
// E13-alerts.md alert types are real now — the form's condition
// fields switch based on the selected type (US-13.02's threshold/
// window, US-13.03's metric/threshold/window), mirroring
// routes/alertRules.ts's discriminated POST body exactly so a
// half-filled condition for the wrong type can never be submitted.
export function AlertRuleList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(alertRulesQueryOptions(projectId));
	const queryClient = useQueryClient();

	const [type, setType] = useState<AlertRuleType>("new_issue");
	const [webhookUrl, setWebhookUrl] = useState("");
	const [windowMinutes, setWindowMinutes] = useState(DEFAULT_WINDOW_MINUTES);
	const [thresholdCount, setThresholdCount] = useState(DEFAULT_THRESHOLD_COUNT);
	const [metricName, setMetricName] =
		useState<AlertMetricName>(DEFAULT_METRIC_NAME);
	const [thresholdValue, setThresholdValue] = useState(DEFAULT_THRESHOLD_VALUE);

	const createMutation = useMutation({
		mutationFn: (input: CreateAlertRuleInput) =>
			createAlertRule(projectId, input),
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

	function buildInput(): CreateAlertRuleInput | null {
		const trimmedUrl = webhookUrl.trim();
		if (!trimmedUrl) {
			return null;
		}

		if (type === "new_issue") {
			return { type, webhookUrl: trimmedUrl };
		}

		const parsedWindow = Number(windowMinutes);
		if (!Number.isFinite(parsedWindow) || parsedWindow <= 0) {
			return null;
		}

		if (type === "error_spike") {
			const parsedThreshold = Number(thresholdCount);
			if (!Number.isFinite(parsedThreshold) || parsedThreshold <= 0) {
				return null;
			}
			return {
				type,
				webhookUrl: trimmedUrl,
				windowMinutes: parsedWindow,
				thresholdCount: parsedThreshold,
			};
		}

		const parsedValue = Number(thresholdValue);
		if (!Number.isFinite(parsedValue) || parsedValue < 0) {
			return null;
		}
		return {
			type,
			webhookUrl: trimmedUrl,
			windowMinutes: parsedWindow,
			metricName,
			thresholdValue: parsedValue,
		};
	}

	return (
		<div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					const input = buildInput();
					if (input) {
						createMutation.mutate(input);
					}
				}}
			>
				<label htmlFor="alertType">Alert type</label>
				<select
					id="alertType"
					value={type}
					onChange={(event) => setType(event.target.value as AlertRuleType)}
				>
					{ALERT_RULE_TYPES.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>

				<label htmlFor="webhookUrl">Webhook URL</label>
				<input
					id="webhookUrl"
					type="url"
					value={webhookUrl}
					onChange={(event) => setWebhookUrl(event.target.value)}
					placeholder="https://example.com/hooks/frontwatch"
					required
				/>

				{type === "error_spike" && (
					<>
						<label htmlFor="windowMinutes">Window (minutes)</label>
						<input
							id="windowMinutes"
							type="number"
							min="1"
							value={windowMinutes}
							onChange={(event) => setWindowMinutes(event.target.value)}
							required
						/>
						<label htmlFor="thresholdCount">Error count threshold</label>
						<input
							id="thresholdCount"
							type="number"
							min="1"
							value={thresholdCount}
							onChange={(event) => setThresholdCount(event.target.value)}
							required
						/>
					</>
				)}

				{type === "performance_regression" && (
					<>
						<label htmlFor="windowMinutes">Window (minutes)</label>
						<input
							id="windowMinutes"
							type="number"
							min="1"
							value={windowMinutes}
							onChange={(event) => setWindowMinutes(event.target.value)}
							required
						/>
						<label htmlFor="metricName">Metric</label>
						<select
							id="metricName"
							value={metricName}
							onChange={(event) =>
								setMetricName(event.target.value as AlertMetricName)
							}
						>
							{ALERT_METRIC_NAMES.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
						<label htmlFor="thresholdValue">
							p75 threshold (metric's native unit — ms, or a unitless score for
							CLS)
						</label>
						<input
							id="thresholdValue"
							type="number"
							min="0"
							step="any"
							value={thresholdValue}
							onChange={(event) => setThresholdValue(event.target.value)}
							required
						/>
					</>
				)}

				<button type="submit" disabled={createMutation.isPending}>
					Create alert rule
				</button>
				{createMutation.isError && (
					// ui-patterns.md §4: errors must be actionable — the most
					// likely real cause is control-api's own validation
					// rejection (routes/alertRules.ts: malformed URL or a
					// missing/invalid condition field), named directly rather
					// than a bare "something went wrong."
					<p role="alert">
						Could not create the rule — check the webhook URL and condition
						fields.
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
							<th>Condition</th>
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
								<td>{describeAlertCondition(rule)}</td>
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
