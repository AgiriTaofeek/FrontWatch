import { describe, expect, it, mock } from "bun:test";
import type { PerformancePayload } from "./event";

// Same reasoning as errors.test.ts/network.test.ts's mock: complete
// shape, since mock.module replaces "./client" in the shared registry
// for the whole test run.
const capturePerformanceEventMock = mock((_payload: PerformancePayload) => {});
mock.module("./client", () => ({
	captureException: mock(() => {}),
	captureNetworkEvent: mock(() => {}),
	capturePerformanceEvent: capturePerformanceEventMock,
	captureNavigationEvent: mock(() => {}),
	init: mock(() => {}),
}));

// web-vitals' own algorithms (LCP/CLS/INP session-windowing,
// back/forward-cache handling, etc.) are Google's to test, not this
// SDK's — mocked here so this test is only about performance.ts's own
// adapter logic: does registerPerformanceInstrumentation() actually
// wire up all five metrics, and does report() map web-vitals' Metric
// shape to PerformancePayload correctly.
function fakeMetric(name: PerformancePayload["metricName"], value: number) {
	return {
		name,
		value,
		rating: "good" as const,
		delta: value,
		id: `v-${name}`,
		entries: [] as PerformanceEntry[],
		navigationType: "navigate" as const,
	};
}

const onCLS = mock((cb: (metric: unknown) => void) =>
	cb(fakeMetric("CLS", 0.05)),
);
const onFCP = mock((cb: (metric: unknown) => void) =>
	cb(fakeMetric("FCP", 900)),
);
const onINP = mock((cb: (metric: unknown) => void) =>
	cb(fakeMetric("INP", 120)),
);
const onLCP = mock((cb: (metric: unknown) => void) =>
	cb(fakeMetric("LCP", 1800)),
);
const onTTFB = mock((cb: (metric: unknown) => void) =>
	cb(fakeMetric("TTFB", 300)),
);

mock.module("web-vitals", () => ({ onCLS, onFCP, onINP, onLCP, onTTFB }));

const { registerPerformanceInstrumentation } = await import("./performance");

describe("registerPerformanceInstrumentation", () => {
	it("registers all five Core Web Vitals callbacks", () => {
		registerPerformanceInstrumentation();

		expect(onCLS).toHaveBeenCalledTimes(1);
		expect(onFCP).toHaveBeenCalledTimes(1);
		expect(onINP).toHaveBeenCalledTimes(1);
		expect(onLCP).toHaveBeenCalledTimes(1);
		expect(onTTFB).toHaveBeenCalledTimes(1);
	});

	it("maps each reported metric to the correct PerformancePayload shape", () => {
		capturePerformanceEventMock.mockClear();
		registerPerformanceInstrumentation();

		expect(capturePerformanceEventMock).toHaveBeenCalledTimes(5);
		const payloads = capturePerformanceEventMock.mock.calls.map(
			(call) => call[0],
		);

		const lcp = payloads.find((p) => p.metricName === "LCP");
		expect(lcp).toMatchObject({
			metricName: "LCP",
			value: 1800,
			rating: "good",
			navigationType: "navigate",
		});

		const cls = payloads.find((p) => p.metricName === "CLS");
		expect(cls).toMatchObject({ metricName: "CLS", value: 0.05 });
	});
});
