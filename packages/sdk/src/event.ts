import type { Context } from "./context";

// The SDK-side event envelope. Deliberately smaller than the full
// ClickHouse row in data-model.md §3 — organization_id/application_id/
// environment_id/project_id are NOT here. The SDK only ever knows its
// public key; ingestion resolves and attaches those tenant IDs
// server-side (data-model.md §10: never trust a frontend-selected
// tenant ID). Only "error" exists as a payload type so far — network/
// performance/breadcrumb/navigation/interaction get added when their
// instrumentation modules actually exist, not speculatively now.

export type EventType = "error";

export interface ErrorPayload {
	message: string;
	exceptionType: string;
	stackTrace?: string;
	handled: boolean;
	source?: {
		filename?: string;
		line?: number;
		column?: number;
	};
}

export interface FrontwatchEvent {
	eventId: string;
	schemaVersion: 1;
	eventType: EventType;
	clientTimestamp: string;
	context: Context;
	payload: ErrorPayload;
}

export function createEvent(
	eventType: EventType,
	payload: ErrorPayload,
	context: Context,
): FrontwatchEvent {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: 1,
		eventType,
		clientTimestamp: new Date().toISOString(),
		context,
		payload,
	};
}
