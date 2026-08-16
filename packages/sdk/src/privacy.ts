import type { Context } from "./context";
import type { ErrorPayload, FrontwatchEvent, NetworkPayload } from "./event";

// ADR-007: redact/filter sensitive data client-side, before transmission,
// wherever technically possible — the first of two redaction layers.
// Server-side redaction (defense in depth, same ADR) is a separate,
// not-yet-built layer, tracked apart from this. Fixed pipeline order per
// privacy-and-security.md: capture -> privacy -> sampling -> buffer ->
// transport (sampling doesn't exist yet either — this is still the very
// next stage after capture, same position the earlier no-op occupied).
//
// Scope of this pass: pattern-based redaction over the string fields this
// SDK actually captures today (error message/stack trace, the normalized
// network resource path, the route pathname). privacy-and-security.md's
// full redaction-layer list also names DOM/input filtering and header
// filtering — both apply to data this SDK doesn't capture at all yet
// (breadcrumbs/interactions, request/response headers), so there is
// nothing to gate there today; wiring those flags in now would just be
// config that silently does nothing. Revisit when that instrumentation
// exists, not before.

export interface PrivacyRule {
	// Surfaced only in the fail-closed console warning below, so a
	// misbehaving custom rule is identifiable by name, not anonymous.
	name: string;
	pattern: RegExp;
	replacement?: string;
}

export interface PrivacyConfig {
	// Organization-specific patterns on top of the built-in rules below —
	// privacy-and-security.md's own example: `customerAccountNumber ->
	// [REDACTED]`. Evaluated in the order given, after the built-ins, so a
	// custom rule can further narrow what a built-in rule already redacted
	// but never has to duplicate it.
	customRules?: PrivacyRule[];
}

const DEFAULT_REPLACEMENT = "[REDACTED]";

// Baseline rules, always on — not configurable off. privacy-and-security.md:
// "never collected by default: passwords, authentication tokens, payment
// credentials... Default principle: do not collect what you do not need."
// This SDK already doesn't capture request/response bodies or headers at
// all (network.ts's own comment), so these rules exist for the shapes that
// realistically do leak through the fields that *are* captured — an error
// message or stack trace built from application data (e.g. `throw new
// Error(\`failed for ${user.email}\`)`), not a redaction of fields that
// were never collected in the first place.
const BUILT_IN_RULES: PrivacyRule[] = [
	{
		name: "email",
		pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
	},
	{
		name: "bearer-token",
		pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
	},
	{
		// Covers both a JSON-stringified fragment (`"password":"x"`) and a
		// query-string/header-like fragment (`token=x`) — the two shapes a
		// stack trace or captured URL realistically contains. Replacement
		// keeps the field name and drops only the value, which is more
		// useful for investigation than blanking the whole match.
		name: "credential-field",
		pattern:
			/(password|passwd|token|secret|api[_-]?key|authorization)["']?\s*[:=]\s*["']?[^\s"',}]+/gi,
		replacement: "$1=[REDACTED]",
	},
	{
		// Payment-card-shaped digit runs (13-19 digits, optionally
		// space/dash-separated in groups) — deliberately not a Luhn check.
		// This over-redacts rather than risk under-redacting a real card
		// number; a false-positive redaction inside a stack trace costs
		// nothing, an unredacted card number leaving the browser does.
		name: "payment-card",
		pattern: /\b(?:\d[ -]?){13,19}\b/g,
	},
];

function redactString(value: string, rules: readonly PrivacyRule[]): string {
	let result = value;
	for (const rule of rules) {
		try {
			result = result.replace(
				rule.pattern,
				rule.replacement ?? DEFAULT_REPLACEMENT,
			);
		} catch (err) {
			// Fail closed (US-03.04: "redaction failures fail closed for
			// protected fields"): a rule that throws mid-evaluation is treated
			// as "this field cannot be evaluated safely" — the *whole* field
			// is replaced, not left as whatever partial result the throwing
			// rule reached, since a partial replace() could still contain the
			// exact sensitive fragment that rule was trying to catch.
			console.warn(
				`[FrontWatch] privacy rule "${rule.name}" failed to evaluate — redacting the field it was checking rather than risk sending it unredacted.`,
				err,
			);
			return DEFAULT_REPLACEMENT;
		}
	}
	return result;
}

function redactErrorPayload(
	payload: ErrorPayload,
	rules: readonly PrivacyRule[],
): ErrorPayload {
	return {
		...payload,
		message: redactString(payload.message, rules),
		stackTrace: payload.stackTrace
			? redactString(payload.stackTrace, rules)
			: payload.stackTrace,
	};
}

function redactNetworkPayload(
	payload: NetworkPayload,
	rules: readonly PrivacyRule[],
): NetworkPayload {
	return {
		...payload,
		resource: redactString(payload.resource, rules),
	};
}

function redactContext(
	context: Context,
	rules: readonly PrivacyRule[],
): Context {
	// route is already a bare pathname (context.ts builds it from
	// window.location.pathname, never the query string) — still routed
	// through the same rules, since a path segment itself can carry
	// sensitive data (e.g. `/reset-password/<token>`) that survives
	// however the app chose to structure its own URLs.
	return {
		...context,
		route: context.route ? redactString(context.route, rules) : context.route,
	};
}

export function applyPrivacy(
	event: FrontwatchEvent,
	config?: PrivacyConfig,
): FrontwatchEvent {
	const rules = [...BUILT_IN_RULES, ...(config?.customRules ?? [])];
	const context = redactContext(event.context, rules);

	switch (event.eventType) {
		case "error":
			return {
				...event,
				context,
				payload: redactErrorPayload(event.payload, rules),
			};
		case "network":
			return {
				...event,
				context,
				payload: redactNetworkPayload(event.payload, rules),
			};
		case "performance":
			// metricName/rating/navigationType are fixed enums and value is
			// numeric — no string field here can carry user data. Still
			// routed through this function so context.route redaction applies
			// uniformly to every event type, not skipped for this one.
			return { ...event, context };
	}
}
