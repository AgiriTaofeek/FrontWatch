import { describe, expect, it } from "bun:test";
import type { Context } from "./context";
import type {
	ErrorPayload,
	FrontwatchEvent,
	NetworkPayload,
	PerformancePayload,
} from "./event";
import { applyPrivacy, type PrivacyConfig } from "./privacy";

const baseContext: Context = {
	environment: "production",
	release: "4.2.0",
	route: "/transfer",
	sessionId: "session-1",
	userAgent: "test-agent",
};

function errorEvent(payload: Partial<ErrorPayload> = {}): FrontwatchEvent {
	return {
		eventId: "event-1",
		schemaVersion: 1,
		clientTimestamp: "2026-08-16T00:00:00.000Z",
		context: baseContext,
		eventType: "error",
		payload: {
			message: "failure",
			exceptionType: "Error",
			handled: true,
			...payload,
		},
	};
}

function networkEvent(payload: Partial<NetworkPayload> = {}): FrontwatchEvent {
	return {
		eventId: "event-2",
		schemaVersion: 1,
		clientTimestamp: "2026-08-16T00:00:00.000Z",
		context: baseContext,
		eventType: "network",
		payload: {
			method: "GET",
			resource: "/api/users/:id",
			status: 200,
			durationMs: 12,
			outcome: "success",
			...payload,
		},
	};
}

function performanceEvent(
	payload: Partial<PerformancePayload> = {},
): FrontwatchEvent {
	return {
		eventId: "event-3",
		schemaVersion: 1,
		clientTimestamp: "2026-08-16T00:00:00.000Z",
		context: baseContext,
		eventType: "performance",
		payload: {
			metricName: "LCP",
			value: 1800,
			rating: "good",
			navigationType: "navigate",
			...payload,
		},
	};
}

describe("applyPrivacy — built-in rules", () => {
	it("redacts an email address in the error message", () => {
		const result = applyPrivacy(
			errorEvent({ message: "failed for jane.doe@example.com" }),
		);
		expect(result.payload).toMatchObject({
			message: "failed for [REDACTED]",
		});
	});

	it("redacts an email address in the stack trace", () => {
		const result = applyPrivacy(
			errorEvent({
				message: "failure",
				stackTrace: "Error: lookup(jane.doe@example.com) at foo.ts:12",
			}),
		);
		expect((result.payload as ErrorPayload).stackTrace).toBe(
			"Error: lookup([REDACTED]) at foo.ts:12",
		);
	});

	it("redacts a Bearer token", () => {
		const result = applyPrivacy(
			errorEvent({
				message: "request failed: credential was Bearer abc123.def456-ghi",
			}),
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"request failed: credential was [REDACTED]",
		);
	});

	it("redacts a password= fragment but keeps the field name", () => {
		const result = applyPrivacy(
			errorEvent({ message: 'login body: {"password":"hunter2"}' }),
		);
		expect((result.payload as ErrorPayload).message).toBe(
			'login body: {"password=[REDACTED]"}',
		);
	});

	it("redacts a payment-card-shaped digit run", () => {
		const result = applyPrivacy(
			errorEvent({ message: "charge failed for card 4111 1111 1111 1111" }),
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"charge failed for card [REDACTED]",
		);
	});

	it("does not redact ordinary short numbers or plain words", () => {
		const result = applyPrivacy(
			errorEvent({ message: "retry 3 of 5 for order line 42" }),
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"retry 3 of 5 for order line 42",
		);
	});

	it("redacts the network resource path", () => {
		const result = applyPrivacy(
			networkEvent({ resource: "/api/users/jane.doe@example.com/profile" }),
		);
		expect((result.payload as NetworkPayload).resource).toBe(
			"/api/users/[REDACTED]/profile",
		);
	});

	it("leaves an unremarkable route untouched", () => {
		const result = applyPrivacy(errorEvent());
		expect(result.context.route).toBe("/transfer");
	});

	it("redacts a sensitive route segment", () => {
		const result = applyPrivacy({
			...errorEvent(),
			context: {
				...baseContext,
				route: "/reset-password/jane.doe@example.com",
			},
		});
		expect(result.context.route).toBe("/reset-password/[REDACTED]");
	});

	it("leaves a performance event's payload untouched but still redacts context", () => {
		const result = applyPrivacy({
			...performanceEvent(),
			context: {
				...baseContext,
				route: "/reset-password/jane.doe@example.com",
			},
		});
		expect(result.payload).toMatchObject({
			metricName: "LCP",
			value: 1800,
			rating: "good",
			navigationType: "navigate",
		});
		expect(result.context.route).toBe("/reset-password/[REDACTED]");
	});

	it("preserves every non-string field unchanged", () => {
		const event = errorEvent();
		const result = applyPrivacy(event);
		expect(result.eventId).toBe(event.eventId);
		expect(result.schemaVersion).toBe(event.schemaVersion);
		expect(result.clientTimestamp).toBe(event.clientTimestamp);
		expect(result.eventType).toBe(event.eventType);
	});
});

describe("applyPrivacy — custom rules", () => {
	it("applies an organization-specific rule on top of the built-ins", () => {
		const config: PrivacyConfig = {
			customRules: [{ name: "customerAccountNumber", pattern: /ACC-\d{6}/g }],
		};
		const result = applyPrivacy(
			errorEvent({ message: "failed for account ACC-123456" }),
			config,
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"failed for account [REDACTED]",
		);
	});

	it("respects a custom replacement string", () => {
		const config: PrivacyConfig = {
			customRules: [
				{
					name: "customerAccountNumber",
					pattern: /ACC-\d{6}/g,
					replacement: "[ACCOUNT]",
				},
			],
		};
		const result = applyPrivacy(
			errorEvent({ message: "failed for account ACC-123456" }),
			config,
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"failed for account [ACCOUNT]",
		);
	});

	it("runs custom rules in addition to, not instead of, the built-ins", () => {
		const config: PrivacyConfig = {
			customRules: [{ name: "acct", pattern: /ACC-\d{6}/g }],
		};
		const result = applyPrivacy(
			errorEvent({
				message: "jane.doe@example.com failed for account ACC-123456",
			}),
			config,
		);
		expect((result.payload as ErrorPayload).message).toBe(
			"[REDACTED] failed for account [REDACTED]",
		);
	});
});

describe("applyPrivacy — fail-closed behavior", () => {
	it("redacts the whole field, not a partial result, when a rule throws", () => {
		// A rule that behaves like a RegExp for String.replace's internal
		// dispatch (via Symbol.replace) but throws instead of matching —
		// the realistic shape of "a rule cannot be evaluated safely" for a
		// custom, org-supplied pattern.
		const throwingPattern = {
			[Symbol.replace]() {
				throw new Error("simulated evaluation failure");
			},
		} as unknown as RegExp;

		const config: PrivacyConfig = {
			customRules: [{ name: "broken-rule", pattern: throwingPattern }],
		};

		const result = applyPrivacy(
			errorEvent({
				message: "jane.doe@example.com should already be redacted first",
			}),
			config,
		);

		// The built-in email rule ran first and matched — but the throwing
		// custom rule still fails the whole field closed rather than
		// returning that already-partially-redacted string.
		expect((result.payload as ErrorPayload).message).toBe("[REDACTED]");
	});
});
