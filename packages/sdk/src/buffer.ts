import type { FrontwatchEvent } from "./event";

// Bounded, FIFO, in-memory. Deliberately narrower than the full spec for
// this skeleton: max event *count* only (no byte-size bound yet — needs
// real payload-size measurement first), no flush timer owned here (that's
// transport's job to call drain() on a schedule), no shutdown-flush
// wiring yet (needs a beforeunload/lifecycle integration point that
// doesn't exist until client.ts's init() does more). Noted as deferred,
// not forgotten.

export interface BufferOptions {
	maxSize?: number;
}

const DEFAULT_MAX_SIZE = 100;

export class EventBuffer {
	private events: FrontwatchEvent[] = [];
	private readonly maxSize: number;

	constructor(options: BufferOptions = {}) {
		this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
	}

	add(event: FrontwatchEvent): void {
		if (this.events.length >= this.maxSize) {
			// Bounded FIFO: buffer is full, drop the oldest rather than the
			// newest — a fresher event is more likely to still be actionable.
			this.events.shift();
		}
		this.events.push(event);
	}

	drain(): FrontwatchEvent[] {
		const drained = this.events;
		this.events = [];
		return drained;
	}

	get size(): number {
		return this.events.length;
	}
}
