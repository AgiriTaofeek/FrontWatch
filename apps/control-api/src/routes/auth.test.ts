import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { authSessions, memberships, organizations, users } from "../db/schema";
import { authRoutes } from "./auth";

// Integration test — hits the real local Postgres, same pattern as
// every other routes/*.test.ts file. Cookie handling is exercised for
// real too: the Set-Cookie header from one response is parsed and
// replayed as the Cookie header on the next request, the same way a
// real browser would.

const createdUserIds: string[] = [];
const createdOrganizationIds: string[] = [];

afterAll(async () => {
	for (const userId of createdUserIds) {
		await db.delete(authSessions).where(eq(authSessions.userId, userId));
		await db.delete(memberships).where(eq(memberships.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
	}
	for (const organizationId of createdOrganizationIds) {
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
});

function extractSessionCookie(response: Response): string {
	const setCookie = response.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("expected a Set-Cookie header on the response");
	}
	// Only the "name=value" pair is needed for the next request's
	// Cookie header — the rest (HttpOnly, Path, etc.) are directives
	// for the browser, not part of what gets sent back.
	return setCookie.split(";")[0] as string;
}

describe("POST /auth/register", () => {
	it("creates an organization + administrator user, and sets a session cookie (US-01.01)", async () => {
		const email = `route_register_${Date.now()}@example.com`;

		const response = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "Route Test Org",
					email,
					name: "Route Test Admin",
					password: "a-fine-password",
				}),
			}),
		);
		const body = await response.json();
		createdUserIds.push(body.userId);
		createdOrganizationIds.push(body.organizationId);

		expect(response.status).toBe(200);
		expect(body.organizationId).toBeTruthy();
		expect(body.userId).toBeTruthy();
		expect(response.headers.get("set-cookie")).toContain("HttpOnly");
	});

	it("rejects a duplicate email with 409", async () => {
		const email = `route_register_dup_${Date.now()}@example.com`;

		const first = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "First",
					email,
					name: "First Admin",
					password: "a-fine-password",
				}),
			}),
		);
		const firstBody = await first.json();
		createdUserIds.push(firstBody.userId);
		createdOrganizationIds.push(firstBody.organizationId);

		const second = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "Second",
					email,
					name: "Second Admin",
					password: "a-fine-password",
				}),
			}),
		);

		expect(second.status).toBe(409);
	});

	it("rejects a password shorter than 8 characters — invalid registrations cannot be saved", async () => {
		const response = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "Weak Password Org",
					email: `route_register_weak_${Date.now()}@example.com`,
					name: "Weak Password Admin",
					password: "short",
				}),
			}),
		);

		expect(response.status).toBe(422);
	});
});

describe("POST /auth/login, GET /auth/me, POST /auth/logout", () => {
	it("logs in with correct credentials, resolves /auth/me from the session cookie, and logout revokes it", async () => {
		const email = `route_login_${Date.now()}@example.com`;
		const password = "a-fine-password";

		const registerResponse = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "Login Test Org",
					email,
					name: "Login Test Admin",
					password,
				}),
			}),
		);
		const registerBody = await registerResponse.json();
		createdUserIds.push(registerBody.userId);
		createdOrganizationIds.push(registerBody.organizationId);

		const loginResponse = await authRoutes.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			}),
		);
		expect(loginResponse.status).toBe(200);
		const sessionCookie = extractSessionCookie(loginResponse);

		const meResponse = await authRoutes.handle(
			new Request("http://localhost/auth/me", {
				headers: { Cookie: sessionCookie },
			}),
		);
		const meBody = await meResponse.json();
		expect(meResponse.status).toBe(200);
		expect(meBody.email).toBe(email);
		expect(meBody.memberships).toHaveLength(1);
		expect(meBody.memberships[0].role).toBe("administrator");
		expect(meBody.memberships[0].organizationName).toBe("Login Test Org");

		const logoutResponse = await authRoutes.handle(
			new Request("http://localhost/auth/logout", {
				method: "POST",
				headers: { Cookie: sessionCookie },
			}),
		);
		expect(logoutResponse.status).toBe(200);

		// auth.md's revocation requirement, exercised end-to-end through
		// the actual HTTP routes, not just the db layer directly.
		const meAfterLogout = await authRoutes.handle(
			new Request("http://localhost/auth/me", {
				headers: { Cookie: sessionCookie },
			}),
		);
		expect(meAfterLogout.status).toBe(401);
	});

	it("rejects login with the wrong password", async () => {
		const email = `route_login_wrong_pw_${Date.now()}@example.com`;

		const registerResponse = await authRoutes.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationName: "Wrong Password Org",
					email,
					name: "Admin",
					password: "the-real-password",
				}),
			}),
		);
		const registerBody = await registerResponse.json();
		createdUserIds.push(registerBody.userId);
		createdOrganizationIds.push(registerBody.organizationId);

		const loginResponse = await authRoutes.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password: "not-the-real-password" }),
			}),
		);

		expect(loginResponse.status).toBe(401);
	});

	it("rejects login for an email that was never registered, with the same response as a wrong password", async () => {
		const response = await authRoutes.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "never_registered@example.com",
					password: "whatever",
				}),
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBe("invalid email or password");
	});
});

describe("GET /auth/me without a session", () => {
	it("returns 401 when no session cookie is present", async () => {
		const response = await authRoutes.handle(
			new Request("http://localhost/auth/me"),
		);
		expect(response.status).toBe(401);
	});
});
