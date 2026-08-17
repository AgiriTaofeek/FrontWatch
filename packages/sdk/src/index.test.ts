import { describe, expect, it } from "bun:test";
import { resolveCaptureConfig } from "./index";

// resolveCaptureConfig is the entire piece of business logic behind
// US-16.02 "Configure Collection" — deliberately tested as a pure
// function, not by mocking init()'s five register*Instrumentation
// imports: mock.module() replaces a module in bun:test's shared
// registry for the whole run, and every one of those five modules also
// has its own test file that needs the *real* implementation to test
// directly (confirmed the hard way — see index.ts's own comment). The
// actual wiring (`if (capture.x) registerX()`) is simple enough that a
// real end-to-end check, not a mocked unit test, is the right-sized
// verification for it.

describe("resolveCaptureConfig", () => {
	it("defaults every category to true when capture is entirely unset", () => {
		expect(resolveCaptureConfig(undefined)).toEqual({
			errors: true,
			network: true,
			performance: true,
			navigation: true,
			interactions: true,
		});
	});

	it("defaults every category to true when capture is an empty object", () => {
		expect(resolveCaptureConfig({})).toEqual({
			errors: true,
			network: true,
			performance: true,
			navigation: true,
			interactions: true,
		});
	});

	it("respects an explicit false for one category, leaves the rest at their default", () => {
		expect(resolveCaptureConfig({ network: false })).toEqual({
			errors: true,
			network: false,
			performance: true,
			navigation: true,
			interactions: true,
		});
	});

	it("respects false for every category at once", () => {
		expect(
			resolveCaptureConfig({
				errors: false,
				network: false,
				performance: false,
				navigation: false,
				interactions: false,
			}),
		).toEqual({
			errors: false,
			network: false,
			performance: false,
			navigation: false,
			interactions: false,
		});
	});

	it("treats an explicit true identically to leaving a category unset", () => {
		expect(resolveCaptureConfig({ errors: true })).toEqual(
			resolveCaptureConfig(undefined),
		);
	});
});
