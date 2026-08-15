import { createHash, randomBytes } from "node:crypto";

// The one cookie name every auth-aware route (this PR's routes/auth.ts
// and the RBAC-enforcement PR's middleware, next) reads/writes —
// defined once here so it can never drift between them.
export const SESSION_COOKIE_NAME = "fw_session";

// ADR-027: Bun.password (argon2id, Bun's own default) — verified
// directly against a real password round-trip before adopting it.
export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password);
}

export function verifyPassword(
	password: string,
	passwordHash: string,
): Promise<boolean> {
	return Bun.password.verify(password, passwordHash);
}

const SESSION_TOKEN_BYTES = 32;
// 30 days — a self-hosted internal dashboard, not a banking app;
// auth.md's "rotation" is real future work (re-issuing a token
// partway through its life), tracked as deferred, not built this
// slice.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// The same lifetime, in seconds — the unit the cookie's `maxAge` needs
// (routes/auth.ts), derived from one constant instead of a second
// hardcoded number that could drift from it.
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

export function generateSessionToken(): string {
	return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

// ADR-027: the raw token is never stored, only its hash — a leaked
// database shouldn't hand out ready-to-use bearer credentials.
// SHA-256, not argon2: this token is already 256 bits of real
// randomness, not a human-chosen secret — argon2's deliberate
// slowness defends against guessing a low-entropy password, which
// doesn't apply here.
export function hashSessionToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date = new Date()): Date {
	return new Date(now.getTime() + SESSION_TTL_MS);
}
