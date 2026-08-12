const PUBLIC_KEY_PREFIX = "fw_pk_";

/**
 * Generates a project's public key — the SDK/telemetry identity boundary
 * (data-model.md §1). Not a secret in the confidentiality sense: it ships
 * inside client-side JS by design, same threat model as a Sentry DSN. Still
 * must be unguessable — it's the only thing standing between "anyone" and
 * "able to write telemetry into this project" — so it's generated
 * server-side from a CSPRNG, never client-suppliable. 32 bytes (256 bits)
 * is generous; the prefix exists purely so a key is identifiable at a
 * glance (Stripe/Sentry-style), not for security.
 */
export function generatePublicKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return PUBLIC_KEY_PREFIX + Buffer.from(bytes).toString("base64url");
}
