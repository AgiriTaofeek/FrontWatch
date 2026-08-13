// Attached to every event. Deliberately minimal for the skeleton:
// - route is the raw pathname, no framework-aware normalization
//   (/accounts/:id-style parameterization is an adapter's job later —
//   core stays framework-independent, ADR-005)
// - userAgent is the raw string, no parsed browser/os/device breakdown
//   yet — that's real work not built here, better to be honest about
//   what exists than fake structured fields from an unparsed string
// - session is a stable random ID for the SDK's in-memory lifetime only
//   — full session lifecycle (start/end, timeout, multi-tab) is Step 7's
//   job, this just gives every event *something* to group by for now

export interface Context {
	environment?: string;
	release?: string;
	route?: string;
	sessionId: string;
	userAgent?: string;
}

export interface SdkConfig {
	environment?: string;
	release?: string;
}

let sessionId: string | undefined;

function getOrCreateSessionId(): string {
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}
	return sessionId;
}

export function buildContext(config: SdkConfig): Context {
	return {
		environment: config.environment,
		release: config.release,
		route: typeof window !== "undefined" ? window.location.pathname : undefined,
		sessionId: getOrCreateSessionId(),
		userAgent:
			typeof navigator !== "undefined" ? navigator.userAgent : undefined,
	};
}
