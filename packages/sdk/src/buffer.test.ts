import { describe, expect, it } from "bun:test";
import { EventBuffer } from "./buffer";
import type { FrontwatchEvent } from "./event";

function fakeEvent(id: string): FrontwatchEvent {
	return {
		eventId: id,
		schemaVersion: 1,
		eventType: "error",
		clientTimestamp: new Date().toISOString(),
		context: { sessionId: "test-session" },
		payload: { message: id, exceptionType: "Error", handled: true },
	};
}

describe("EventBuffer", () => {
	it("drains everything it was given, in order", () => {
		const buffer = new EventBuffer();
		buffer.add(fakeEvent("a"));
		buffer.add(fakeEvent("b"));

		expect(buffer.size).toBe(2);
		const drained = buffer.drain();
		expect(drained.map((e) => e.eventId)).toEqual(["a", "b"]);
		expect(buffer.size).toBe(0);
	});

	it("evicts the oldest event once maxSize is exceeded (bounded FIFO)", () => {
		const buffer = new EventBuffer({ maxSize: 2 });
		buffer.add(fakeEvent("a"));
		buffer.add(fakeEvent("b"));
		buffer.add(fakeEvent("c"));

		expect(buffer.size).toBe(2);
		expect(buffer.drain().map((e) => e.eventId)).toEqual(["b", "c"]);
	});
});
