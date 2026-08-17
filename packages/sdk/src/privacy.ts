import type { Context } from "./context";
import type {
	Breadcrumb,
	ErrorPayload,
	FrontwatchEvent,
	NavigationPayload,
	NetworkPayload,
} from "./event";

// ADR-007: redact/filter sensitive data client-side, before transmission,
// wherever technically possible — the first of two redaction layers.
// Server-side redaction (defense in depth, same ADR) is a separate,
// not-yet-built layer, tracked apart from this. Fixed pipeline order per
// privacy-and-security.md: capture -> privacy -> sampling -> buffer ->
// transport (sampling doesn't exist yet either — this is still the very
// next stage after capture, same position the earlier no-op occupied).
//
// Scope of this pass: pattern-based redaction over the string fields this
// SDK actually captures today (error message/stack trace, breadcrumb
// messages/data attached to an error, the normalized network resource
// path, the route pathname). privacy-and-security.md's full redaction-
// layer list also names header filtering — this SDK doesn't capture
// request/response headers at all (network.ts's own comment), so there
// is nothing to gate there today; wiring that flag in now would just be
// config that silently does nothing. Revisit when that instrumentation
// exists, not before. interactions.ts's own click-description function
// is a *structural* guarantee against capturing input values/text
// content (never collects them in the first place) rather than
// something this redaction layer has to catch after the fact — see that
// file's own comment.

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
		//
		// The value alternatives matter: a real, previously-shipped bug
		// (code review, 2026-08-17) had the value stop at the first
		// whitespace ([^\s"',}]+), so a multi-word secret like
		// `password=hunter two words` only redacted "hunter" and shipped
		// " two words" in cleartext — verified empirically, not assumed.
		// Fixed with three alternatives, tried in order: a double-quoted
		// value (spaces allowed inside), a single-quoted value (same), or
		// an unquoted value that consumes everything up to the next `,`/`}`
		// or line break (not just the next space) — deliberately
		// over-redacting any trailing prose on the same unquoted fragment
		// rather than risk leaking part of the actual secret, the same
		// "over-redact rather than under-redact" tradeoff the payment-card
		// rule below already makes. Stopping at a line break specifically
		// keeps this from swallowing an entire multi-line stack trace once
		// one line happens to contain an unquoted "token=...".
		name: "credential-field",
		pattern:
			/(password|passwd|token|secret|api[_-]?key|authorization)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^,}\n]+)/gi,
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

// data is an open Record<string, unknown> — addBreadcrumb() is the one
// manual, developer-facing API this SDK has (index.ts's own export),
// and its second argument is fully open, so a real caller can and does
// pass nested structures: addBreadcrumb("transfer failed", { user: {
// email: "jane.doe@example.com" } }). A real, previously-shipped bug
// (code review, 2026-08-17) only walked one level deep — a string
// value's own comment used to justify this by saying "this SDK doesn't
// capture free-text object values automatically anyway," which is true
// for automatic instrumentation but not for the one API this function
// exists specifically to protect. Recurses through plain objects and
// arrays now; only primitives (number/boolean/null/undefined) and
// values already handled elsewhere pass through unredacted.
//
// depth is a bounded recursion guard, not a stylistic choice — a
// circular reference or a pathologically deep structure passed to the
// open addBreadcrumb() API must not be able to blow the call stack or
// hang the host page (the same "SDK failures must never crash the
// application" guarantee client.ts's own constructor already makes).
// Past the limit, the whole subtree is replaced rather than risk
// descending into a cycle — fail closed, same principle redactString's
// own try/catch already applies to a single field.
const MAX_BREADCRUMB_DATA_DEPTH = 5;

function redactBreadcrumbDataValue(
	value: unknown,
	rules: readonly PrivacyRule[],
	depth: number,
): unknown {
	if (typeof value === "string") {
		return redactString(value, rules);
	}
	if (depth >= MAX_BREADCRUMB_DATA_DEPTH) {
		return Array.isArray(value) || (value !== null && typeof value === "object")
			? DEFAULT_REPLACEMENT
			: value;
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			redactBreadcrumbDataValue(item, rules, depth + 1),
		);
	}
	if (value !== null && typeof value === "object") {
		return redactBreadcrumbData(
			value as Record<string, unknown>,
			rules,
			depth + 1,
		);
	}
	// number/boolean/null/undefined — nothing for a redaction rule to
	// operate on.
	return value;
}

function redactBreadcrumbData(
	data: Record<string, unknown>,
	rules: readonly PrivacyRule[],
	depth = 0,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		result[key] = redactBreadcrumbDataValue(value, rules, depth);
	}
	return result;
}

function redactBreadcrumb(
	breadcrumb: Breadcrumb,
	rules: readonly PrivacyRule[],
): Breadcrumb {
	return {
		...breadcrumb,
		message: redactString(breadcrumb.message, rules),
		data: breadcrumb.data
			? redactBreadcrumbData(breadcrumb.data, rules)
			: breadcrumb.data,
	};
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
		// instrumentation.md §Breadcrumbs: "same privacy rules as any other
		// telemetry apply" — the trail rides along inside this payload, so
		// it goes through the exact same redaction as message/stackTrace,
		// not a separate/weaker pass.
		breadcrumbs: payload.breadcrumbs?.map((b) => redactBreadcrumb(b, rules)),
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

function redactNavigationPayload(
	payload: NavigationPayload,
	rules: readonly PrivacyRule[],
): NavigationPayload {
	// Same reasoning as context.route (redactContext below) — a route
	// segment can carry sensitive data regardless of which field it
	// arrives in.
	return {
		...payload,
		fromRoute: payload.fromRoute
			? redactString(payload.fromRoute, rules)
			: payload.fromRoute,
		toRoute: redactString(payload.toRoute, rules),
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
		case "navigation":
			return {
				...event,
				context,
				payload: redactNavigationPayload(event.payload, rules),
			};
	}
}
