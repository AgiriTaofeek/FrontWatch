import { EventBuffer } from "./buffer";
import { buildContext, type SdkConfig } from "./context";
import { createEvent, type ErrorPayload } from "./event";
import { applyPrivacy } from "./privacy";
import { Transport } from "./transport";

export interface InitOptions extends SdkConfig {
	publicKey: string;
	endpoint: string;
	debug?: boolean;
}

export class Client {
	private readonly config: InitOptions;
	private readonly buffer: EventBuffer;
	private readonly transport: Transport;
	// Invalid configuration must never crash the host application
	// (core-architecture.md §Initialization) — an SDK with a bad config
	// silently does nothing rather than throwing.
	private readonly enabled: boolean;

	constructor(options: InitOptions) {
		this.config = options;
		this.buffer = new EventBuffer();
		this.transport = new Transport({
			endpoint: options.endpoint,
			publicKey: options.publicKey,
		});
		this.enabled = Boolean(options.publicKey && options.endpoint);

		if (!this.enabled) {
			console.warn(
				"[FrontWatch] init() called without a publicKey/endpoint — SDK disabled, will not capture or send events.",
			);
		}
	}

	captureException(error: unknown, handled = true): void {
		if (!this.enabled) {
			return;
		}

		const payload = errorToPayload(error, handled);
		const context = buildContext(this.config);
		const event = applyPrivacy(createEvent("error", payload, context));
		this.buffer.add(event);
		// Skeleton: flush immediately rather than on a timer/threshold —
		// real flush scheduling (interval, buffer-full threshold, shutdown
		// flush) is follow-up work, once there's an actual reason to batch
		// multiple events into one request.
		void this.flush();
	}

	async flush(): Promise<void> {
		if (!this.enabled) {
			return;
		}
		const events = this.buffer.drain();
		await this.transport.send(events);
	}
}

function errorToPayload(error: unknown, handled: boolean): ErrorPayload {
	if (error instanceof Error) {
		return {
			message: error.message,
			exceptionType: error.name,
			stackTrace: error.stack,
			handled,
		};
	}
	return {
		message: String(error),
		exceptionType: "UnknownError",
		handled,
	};
}

let client: Client | undefined;

// Duplicate init() calls: documented behavior is "ignore, warn in debug
// mode, return the existing client" — core-architecture.md explicitly
// calls out that this needs to be deterministic, not left implicit.
export function init(options: InitOptions): Client {
	if (client) {
		if (options.debug) {
			console.warn(
				"[FrontWatch] init() called more than once — ignoring, returning the existing client.",
			);
		}
		return client;
	}
	client = new Client(options);
	return client;
}

export function captureException(error: unknown, handled = true): void {
	if (!client) {
		console.warn(
			"[FrontWatch] captureException() called before init() — dropping.",
		);
		return;
	}
	client.captureException(error, handled);
}
