import { describe, expect, it } from "bun:test";
import type { FrontwatchEvent } from "./event";
import { toIngestRequest, toWireEvent } from "./serialize";

// Contract test: the SDK's serialized output must match the documented
// wire format (docs/05-architecture/api-contracts.md §3-4), not just
// whatever shape felt convenient internally. sample-ingest-request.json
// is lifted directly from that doc's own example — this is the actual
// contract, not a fixture I invented separately from the spec.
const sampleRequest = await Bun.file(
	"../contracts/fixtures/sample-ingest-request.json",
).json();

const internalEvent: FrontwatchEvent = {
	eventId: "evt_123",
	schemaVersion: 1,
	eventType: "error",
	clientTimestamp: "2026-08-11T14:29:59.123Z",
	context: {
		release: "2026.08.11",
		sessionId: "sess_123",
		route: "/dashboard",
	},
	payload: {
		message: "Cannot read properties of undefined",
		exceptionType: "TypeError",
		handled: false,
	},
};

describe("toWireEvent", () => {
	it("produces exactly the documented wire shape (snake_case, flat)", () => {
		expect(toWireEvent(internalEvent)).toEqual(sampleRequest.events[0]);
	});

	it("passes an attached breadcrumb trail through unchanged (no field-name mapping needed)", () => {
		const wire = toWireEvent({
			...internalEvent,
			payload: {
				...internalEvent.payload,
				breadcrumbs: [
					{
						category: "network",
						message: "GET /api/accounts -> 200",
						timestamp: "2026-08-11T14:29:58.000Z",
						data: { attempt: 1 },
					},
				],
			},
		});

		if (wire.event_type === "error") {
			expect(wire.payload.breadcrumbs).toEqual([
				{
					category: "network",
					message: "GET /api/accounts -> 200",
					timestamp: "2026-08-11T14:29:58.000Z",
					data: { attempt: 1 },
				},
			]);
		}
	});
});

describe("toIngestRequest", () => {
	it("wraps events in the documented batch envelope", () => {
		const request = toIngestRequest([internalEvent]);

		expect(request.schema_version).toBe(1);
		expect(typeof request.sent_at).toBe("string");
		expect(request.events).toEqual(sampleRequest.events);
	});
});
