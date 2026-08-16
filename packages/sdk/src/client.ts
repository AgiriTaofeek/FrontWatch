import { getBreadcrumbTrail, recordBreadcrumb } from "./breadcrumbs";
import { EventBuffer } from "./buffer";
import { buildContext, type SdkConfig } from "./context";
import {
	createErrorEvent,
	createNavigationEvent,
	createNetworkEvent,
	createPerformanceEvent,
	type ErrorPayload,
	type FrontwatchEvent,
	type NavigationPayload,
	type NetworkPayload,
	type PerformancePayload,
} from "./event";
import { applyPrivacy, type PrivacyConfig } from "./privacy";
import { Transport } from "./transport";

export interface InitOptions extends SdkConfig {
	publicKey: string;
	endpoint: string;
	debug?: boolean;
	// Custom redaction rules on top of privacy.ts's always-on built-ins —
	// see that file's own comment for why maskText/maskInputs/redactHeaders
	// aren't config options yet (nothing captures DOM text/inputs/headers
	// for them to gate today).
	privacy?: PrivacyConfig;
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
		// Trail is read *before* this error is recorded as its own
		// breadcrumb below — it must describe what led up to this error,
		// not include the error itself (breadcrumbs.ts's docs comment: "the
		// trail leading up to it", instrumentation.md's own example ends
		// its trail at "Error → TypeError", not after it). Omitted entirely
		// (not sent as []) when there's nothing to attach yet — same
		// "don't send a meaningless empty structure" convention this file
		// already uses for the optional `client` field.
		const trail = getBreadcrumbTrail();
		if (trail.length > 0) {
			payload.breadcrumbs = trail;
		}
		const context = buildContext(this.config);
		this.recordEvent(createErrorEvent(payload, context));
		// Recorded *after* attaching the trail above, so a second error
		// later in the same session sees this one in its own trail.
		recordBreadcrumb("error", `${payload.exceptionType}: ${payload.message}`);
	}

	// Automatic-only — instrumentation.md doesn't document a manual API
	// for network events the way captureException is documented as
	// manual+automatic, so this stays un-exported from the package's
	// public surface (index.ts), used only by network.ts.
	captureNetworkEvent(payload: NetworkPayload): void {
		if (!this.enabled) {
			return;
		}
		const context = buildContext(this.config);
		this.recordEvent(createNetworkEvent(payload, context));
	}

	// Same automatic-only reasoning as captureNetworkEvent — used only
	// by performance.ts.
	capturePerformanceEvent(payload: PerformancePayload): void {
		if (!this.enabled) {
			return;
		}
		const context = buildContext(this.config);
		this.recordEvent(createPerformanceEvent(payload, context));
	}

	// Same automatic-only reasoning as captureNetworkEvent — used only by
	// navigation.ts, alongside (not instead of) that module's existing
	// "navigation" breadcrumb recording. Two different consumers of the
	// same underlying route-change signal: this is the standalone,
	// independently-queryable event; the breadcrumb is context attached
	// to a future error.
	captureNavigationEvent(payload: NavigationPayload): void {
		if (!this.enabled) {
			return;
		}
		const context = buildContext(this.config);
		this.recordEvent(createNavigationEvent(payload, context));
	}

	// Shared by both capture methods above — now that there's a second
	// real caller, the shared privacy->buffer->flush sequence earns
	// being factored out (event *construction* stays separate per
	// type, in event.ts, since that part genuinely differs).
	private recordEvent(event: FrontwatchEvent): void {
		this.buffer.add(applyPrivacy(event, this.config.privacy));
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

// No console.warn-before-init here unlike captureException — this is
// called automatically, at high frequency, by network.ts's fetch
// wrapper; warning on every request before init() would be noisy in a
// way a one-off manual captureException() call before init() isn't.
export function captureNetworkEvent(payload: NetworkPayload): void {
	client?.captureNetworkEvent(payload);
}

// Same reasoning as captureNetworkEvent — web-vitals' callbacks fire
// automatically, well before a developer would ever have a chance to
// call init() first in some edge cases (e.g. TTFB can report very
// early in the page lifecycle); a warning here would too often just be
// noise about normal timing, not a real misconfiguration.
export function capturePerformanceEvent(payload: PerformancePayload): void {
	client?.capturePerformanceEvent(payload);
}

// Same reasoning as captureNetworkEvent/capturePerformanceEvent — fired
// automatically by navigation.ts's History API patch, no manual API.
export function captureNavigationEvent(payload: NavigationPayload): void {
	client?.captureNavigationEvent(payload);
}
