import { describe, expect, it } from "bun:test";
import {
	generateSessionToken,
	hashPassword,
	hashSessionToken,
	sessionExpiry,
	verifyPassword,
} from "./auth";

describe("hashPassword / verifyPassword", () => {
	it("round-trips a real password through Bun.password", async () => {
		const hash = await hashPassword("correct horse battery staple");

		expect(await verifyPassword("correct horse battery staple", hash)).toBe(
			true,
		);
		expect(await verifyPassword("wrong password", hash)).toBe(false);
	});

	it("never stores the password in plain text", async () => {
		const hash = await hashPassword("correct horse battery staple");
		expect(hash).not.toContain("correct horse battery staple");
	});
});

describe("generateSessionToken / hashSessionToken", () => {
	it("generates a long, unpredictable token each call", () => {
		const a = generateSessionToken();
		const b = generateSessionToken();

		expect(a).not.toBe(b);
		expect(a.length).toBeGreaterThan(32);
	});

	it("hashes deterministically — the same token always hashes the same way", () => {
		const token = generateSessionToken();
		expect(hashSessionToken(token)).toBe(hashSessionToken(token));
	});

	it("hashes two different tokens to two different hashes", () => {
		const a = generateSessionToken();
		const b = generateSessionToken();
		expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
	});

	it("never stores the raw token in its own hash", () => {
		const token = generateSessionToken();
		expect(hashSessionToken(token)).not.toContain(token);
	});
});

describe("sessionExpiry", () => {
	it("returns a timestamp 30 days after the given instant", () => {
		const now = new Date("2026-08-15T00:00:00.000Z");
		const expiry = sessionExpiry(now);

		const expectedMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
		expect(expiry.getTime()).toBe(expectedMs);
	});
});
