// Attached to every event. Deliberately minimal for the skeleton:
// - route is the raw pathname, no framework-aware normalization
//   (/accounts/:id-style parameterization is an adapter's job later —
//   core stays framework-independent, ADR-005)
// - userAgent is the raw string, no parsed browser/os/device breakdown
//   yet — that's real work not built here, better to be honest about
//   what exists than fake structured fields from an unparsed string
// - session is now a real lifecycle (Step 7), not just a random ID for
//   the SDK's in-memory lifetime: it survives a page reload within the
//   same tab (session-investigation.md's "session" means a real user
//   session, not "however long this particular page happened to stay
//   open"), and expires after a period of inactivity so a tab left open
//   for days doesn't stay one endless session. Multi-tab is still out
//   of scope — sessionStorage is per-tab by design, and that's an
//   acceptable approximation for now, not solved here.

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

const SESSION_STORAGE_KEY = "__frontwatch_session__";

// 30 minutes — the same inactivity window analytics tools (GA4, and
// error-monitoring tools like Sentry) default to. Not documented
// anywhere in this repo as a hard requirement, so this is a reasonable
// default, not a spec'd value — easy to revisit.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface StoredSession {
	id: string;
	lastActivityAt: number;
}

// Fallback for environments with no sessionStorage at all (SSR, or a
// browser with storage genuinely disabled) — matches the skeleton's
// original behavior exactly: a random ID for as long as this module
// stays loaded, nothing more.
let memorySession: StoredSession | undefined;

function getSessionStorage(): Storage | undefined {
	try {
		if (typeof window === "undefined" || !window.sessionStorage) {
			return undefined;
		}
		return window.sessionStorage;
	} catch {
		// Some browsers throw merely on *accessing* storage under certain
		// privacy settings, not just on read/write — never let that crash
		// the host application.
		return undefined;
	}
}

function loadSession(storage: Storage | undefined): StoredSession | undefined {
	if (!storage) {
		return memorySession;
	}
	try {
		const raw = storage.getItem(SESSION_STORAGE_KEY);
		if (!raw) {
			return undefined;
		}
		return JSON.parse(raw) as StoredSession;
	} catch {
		// Malformed JSON (e.g. another script sharing the key) — treat as
		// no session rather than crash; a new one gets created below.
		return undefined;
	}
}

function saveSession(
	storage: Storage | undefined,
	session: StoredSession,
): void {
	if (!storage) {
		memorySession = session;
		return;
	}
	try {
		storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
	} catch {
		// Storage full or blocked (e.g. Safari private browsing throws on
		// write even though sessionStorage itself exists) — degrade to
		// memory for the rest of this page load instead of crashing.
		memorySession = session;
	}
}

function getOrCreateSessionId(): string {
	const now = Date.now();
	const storage = getSessionStorage();
	const existing = loadSession(storage);

	if (existing && now - existing.lastActivityAt < SESSION_TIMEOUT_MS) {
		// Every event extends the session — matches "session" meaning "a
		// continuous period of activity," not "the first 30 minutes after
		// the tab opened."
		saveSession(storage, { id: existing.id, lastActivityAt: now });
		return existing.id;
	}

	const created: StoredSession = {
		id: crypto.randomUUID(),
		lastActivityAt: now,
	};
	saveSession(storage, created);
	return created.id;
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
