import type { FrontwatchEvent } from "./event";

// Batches events into one request, retries only failures likely to
// succeed later (5xx / network errors), bounded exponential backoff,
// never retries forever — matches core-architecture.md's buffering &
// transport spec. A 4xx means the request itself is wrong (bad auth,
// malformed body); retrying it would just fail the same way again, so
// only 5xx/network failures are retryable. Compression is deferred —
// not needed for correctness, only for request size, revisit once
// there's real payload volume to measure against.
//
// Deliberately fine to build this against a target that doesn't exist
// yet (ingestion is Step 4) — failure handling *is* transport's job
// regardless of whether the endpoint is real; it'll just always take
// the retryable-failure path until Step 4 gives it somewhere to land.

export interface TransportOptions {
	endpoint: string;
	publicKey: string;
	maxRetries?: number;
	baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

export class Transport {
	private readonly endpoint: string;
	private readonly publicKey: string;
	private readonly maxRetries: number;
	private readonly baseDelayMs: number;

	constructor(options: TransportOptions) {
		this.endpoint = options.endpoint;
		this.publicKey = options.publicKey;
		this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
		this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
	}

	async send(events: FrontwatchEvent[]): Promise<void> {
		if (events.length === 0) {
			return;
		}

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				const response = await fetch(this.endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Frontwatch-Key": this.publicKey,
					},
					body: JSON.stringify({ events }),
				});

				if (response.ok || response.status < 500) {
					// Accepted, or a permanent rejection (4xx) — either way,
					// retrying won't help. Stop.
					return;
				}
			} catch {
				// Network failure — fall through to retry below.
			}

			if (attempt < this.maxRetries) {
				const delay = this.baseDelayMs * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
		// Bounded retries exhausted — drop. SDK failure must never become
		// application failure (ADR-006); there's nowhere else for this to go.
	}
}
