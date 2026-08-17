import { addBreadcrumb } from "./breadcrumbs";
import {
	type CaptureConfig,
	captureException,
	type InitOptions,
	init as initClient,
} from "./client";
import { registerErrorInstrumentation } from "./errors";
import { registerInteractionInstrumentation } from "./interactions";
import { registerNavigationInstrumentation } from "./navigation";
import { registerNetworkInstrumentation } from "./network";
import { registerPerformanceInstrumentation } from "./performance";

export type { CaptureConfig, InitOptions } from "./client";
export { registerErrorInstrumentation } from "./errors";
export type { Breadcrumb, BreadcrumbCategory } from "./event";
export { registerInteractionInstrumentation } from "./interactions";
export { registerNavigationInstrumentation } from "./navigation";
export { registerNetworkInstrumentation } from "./network";
export { registerPerformanceInstrumentation } from "./performance";
// Public so a consuming app can actually name these types when building
// its own customRules config (US-16.01: "redaction rules can be
// configured") — exported from client.ts's InitOptions type already, but
// re-exported here directly too since that's the more discoverable name.
export type { PrivacyConfig, PrivacyRule } from "./privacy";
export { addBreadcrumb, captureException };

// core-architecture.md lists "register instrumentation" as one of
// init()'s own responsibilities — client.ts's init() never actually
// did that (it only builds the Client), a real gap only caught while
// adding a second instrumentation module. Registration lives here,
// not in client.ts, deliberately: errors.ts and network.ts both
// import from client.ts (captureException/captureNetworkEvent) — if
// client.ts imported *them* back to auto-register, that's a circular
// import. index.ts sits above both, so it can safely import and
// register both without the cycle.
let instrumentationRegistered = false;

// US-16.02 "Configure Collection": every category defaults to true — an
// app that doesn't set `capture` at all keeps today's existing behavior
// exactly. Pulled out as its own pure function, exported for direct
// testing, specifically so a test never has to mock() any of the five
// register*Instrumentation imports above: mock.module() replaces a
// module in bun:test's *shared* registry for the whole run, and
// errors.test.ts/network.test.ts/performance.test.ts/etc. each need the
// *real* implementation of their own module to test it directly — a
// test file here mocking "./errors" etc. to observe init()'s wiring
// would silently break every one of those other files' own tests
// instead (confirmed the hard way: doing exactly that made
// performance.test.ts's real assertions fail against a stub that
// doesn't call web-vitals' callbacks at all).
export function resolveCaptureConfig(
	capture: CaptureConfig | undefined,
): Required<CaptureConfig> {
	return {
		errors: capture?.errors ?? true,
		network: capture?.network ?? true,
		performance: capture?.performance ?? true,
		navigation: capture?.navigation ?? true,
		interactions: capture?.interactions ?? true,
	};
}

export function init(options: InitOptions) {
	const client = initClient(options);

	// Guarded separately from client.ts's own duplicate-init handling —
	// a repeat init() call still returns early there, but without this
	// guard here too, a second init() call would re-wrap window.fetch
	// on top of the already-wrapped one (and register a second pair of
	// error listeners), not just no-op.
	if (!instrumentationRegistered) {
		const capture = resolveCaptureConfig(options.capture);
		if (capture.errors) {
			registerErrorInstrumentation();
		}
		if (capture.network) {
			registerNetworkInstrumentation({ ignoreUrlPrefix: options.endpoint });
		}
		if (capture.performance) {
			registerPerformanceInstrumentation();
		}
		if (capture.navigation) {
			registerNavigationInstrumentation();
		}
		if (capture.interactions) {
			registerInteractionInstrumentation();
		}
		instrumentationRegistered = true;
	}

	return client;
}
