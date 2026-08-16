import { addBreadcrumb } from "./breadcrumbs";
import {
	captureException,
	type InitOptions,
	init as initClient,
} from "./client";
import { registerErrorInstrumentation } from "./errors";
import { registerInteractionInstrumentation } from "./interactions";
import { registerNavigationInstrumentation } from "./navigation";
import { registerNetworkInstrumentation } from "./network";
import { registerPerformanceInstrumentation } from "./performance";

export type { InitOptions } from "./client";
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

export function init(options: InitOptions) {
	const client = initClient(options);

	// Guarded separately from client.ts's own duplicate-init handling —
	// a repeat init() call still returns early there, but without this
	// guard here too, a second init() call would re-wrap window.fetch
	// on top of the already-wrapped one (and register a second pair of
	// error listeners), not just no-op.
	if (!instrumentationRegistered) {
		registerErrorInstrumentation();
		registerNetworkInstrumentation({ ignoreUrlPrefix: options.endpoint });
		registerPerformanceInstrumentation();
		registerNavigationInstrumentation();
		registerInteractionInstrumentation();
		instrumentationRegistered = true;
	}

	return client;
}
