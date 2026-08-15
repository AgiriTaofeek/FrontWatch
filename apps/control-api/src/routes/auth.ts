import { Elysia, t } from "elysia";
import { createAuthSession, deleteAuthSession } from "../db/authSessions";
import {
	DuplicateEmailError,
	registerOrganizationAndAdmin,
} from "../db/registration";
import { getUserByEmail } from "../db/users";
import {
	generateSessionToken,
	hashPassword,
	hashSessionToken,
	SESSION_COOKIE_NAME,
	SESSION_TTL_SECONDS,
	sessionExpiry,
	verifyPassword,
} from "../lib/auth";
import { resolveSessionPrincipal } from "../lib/sessionPrincipal";

// Step 9's first auth slice (ADR-027): local email+password, session
// cookies. This PR builds identity + the session mechanism only —
// RBAC enforcement on the other 14 existing endpoints, and
// tenant-isolation tests, are the deliberately separate next PR
// (confirmed with the user before building either).
//
// `secure` is conditional on NODE_ENV: a `secure` cookie is never sent
// by the browser over plain http, which the local dev stack (and CI)
// both use — hardcoding `secure: true` would make login silently not
// work outside production TLS.
const isProduction = process.env.NODE_ENV === "production";

// A real, fixed-cost Bun.password hash of an unguessable value —
// verifyPassword runs against this on a "no such user" login attempt
// so the response takes roughly the same time either way, rather than
// returning instantly and leaking (via timing) that the email wasn't
// registered.
const DUMMY_HASH = await hashPassword(generateSessionToken());

// Every route that touches the session cookie declares the same
// schema — Elysia only gives `cookie[name].value` a real `string`
// type (rather than `unknown`) once the cookie shape is declared like
// this, confirmed empirically.
const sessionCookieSchema = t.Cookie({
	[SESSION_COOKIE_NAME]: t.Optional(t.String()),
});

export const authRoutes = new Elysia()
	.post(
		"/auth/register",
		async ({ body, cookie, status }) => {
			const passwordHash = await hashPassword(body.password);

			let principal: Awaited<ReturnType<typeof registerOrganizationAndAdmin>>;
			try {
				principal = await registerOrganizationAndAdmin({
					organizationName: body.organizationName,
					email: body.email,
					name: body.name,
					passwordHash,
				});
			} catch (err) {
				if (err instanceof DuplicateEmailError) {
					return status(409, { error: err.message });
				}
				throw err;
			}

			const token = generateSessionToken();
			await createAuthSession(
				principal.userId,
				hashSessionToken(token),
				sessionExpiry(),
			);
			cookie[SESSION_COOKIE_NAME].set({
				value: token,
				httpOnly: true,
				sameSite: "strict",
				secure: isProduction,
				path: "/",
				maxAge: SESSION_TTL_SECONDS,
			});

			return {
				organizationId: principal.organizationId,
				userId: principal.userId,
			};
		},
		{
			body: t.Object({
				organizationName: t.String({ minLength: 1 }),
				email: t.String({ format: "email" }),
				name: t.String({ minLength: 1 }),
				// auth.md doesn't specify a minimum, but "invalid rules
				// cannot be saved" is the same principle US-13.01 already
				// applied to alert rules — reject an obviously-too-weak
				// password before it ever reaches a stored hash, rather
				// than accepting anything.
				password: t.String({ minLength: 8 }),
			}),
			cookie: sessionCookieSchema,
		},
	)
	.post(
		"/auth/login",
		async ({ body, cookie, status }) => {
			const user = await getUserByEmail(body.email);

			// Same response whether the email doesn't exist, the password
			// is wrong, or the account is disabled — distinguishing them
			// would let an attacker enumerate registered emails.
			// verifyPassword still runs against a real hash either way (the
			// DUMMY_HASH path when there's no real user to check against),
			// so a non-existent email doesn't respond measurably faster —
			// the same timing-safety reasoning ingestion's own
			// invalid-vs-inactive credential response already applied
			// (services/data-plane/cmd/ingestion/main.go).
			if (user?.status !== "active") {
				await verifyPassword(body.password, DUMMY_HASH);
				return status(401, { error: "invalid email or password" });
			}

			const valid = await verifyPassword(body.password, user.passwordHash);
			if (!valid) {
				return status(401, { error: "invalid email or password" });
			}

			const token = generateSessionToken();
			await createAuthSession(
				user.id,
				hashSessionToken(token),
				sessionExpiry(),
			);
			cookie[SESSION_COOKIE_NAME].set({
				value: token,
				httpOnly: true,
				sameSite: "strict",
				secure: isProduction,
				path: "/",
				maxAge: SESSION_TTL_SECONDS,
			});

			return { userId: user.id };
		},
		{
			body: t.Object({
				email: t.String({ format: "email" }),
				password: t.String({ minLength: 1 }),
			}),
			cookie: sessionCookieSchema,
		},
	)
	.post(
		"/auth/logout",
		async ({ cookie, status }) => {
			const token = cookie[SESSION_COOKIE_NAME].value;
			if (token) {
				await deleteAuthSession(hashSessionToken(token));
			}
			cookie[SESSION_COOKIE_NAME].remove();
			return status(200, { loggedOut: true });
		},
		{ cookie: sessionCookieSchema },
	)
	.get(
		"/auth/me",
		async ({ cookie, status }) => {
			const principal = await resolveSessionPrincipal(
				cookie[SESSION_COOKIE_NAME].value,
			);
			if (!principal) {
				return status(401, { error: "not authenticated" });
			}
			return principal;
		},
		{ cookie: sessionCookieSchema },
	);
