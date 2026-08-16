import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { capturePerformanceEvent } from "./client";
import type { PerformancePayload } from "./event";

// instrumentation.md §Performance's hard requirement — "the
// instrumentation must itself be measured — it must not significantly
// distort the metrics it's trying to observe" — is exactly why this
// wraps the official `web-vitals` library instead of hand-rolling LCP/
// CLS/INP calculation: those algorithms have real edge cases (layout-
// shift session windowing, back/forward-cache restores, soft
// navigations) that a naive reimplementation would get wrong in ways
// that could itself skew the numbers. `web-vitals` uses
// PerformanceObserver under the hood, not polling, so registering it
// adds no meaningful overhead of its own.
//
// Default reporting (no options passed to onX) reports each metric
// once per page — the final settled value, not every intermediate
// change — which keeps event volume proportional to page views, not
// to layout-shift/interaction frequency.
function report(metric: {
	name: PerformancePayload["metricName"];
	value: number;
	rating: PerformancePayload["rating"];
	navigationType: string;
}): void {
	capturePerformanceEvent({
		metricName: metric.name,
		value: metric.value,
		rating: metric.rating,
		navigationType: metric.navigationType,
	});
}

// SSR-safety guard — see errors.ts's identical comment for why. web-vitals
// itself is a browser-only library (PerformanceObserver etc.) — not
// assumed to already guard this internally, confirmed the same way the
// other four modules were: a real non-browser call before this guard
// existed.
export function registerPerformanceInstrumentation(): void {
	if (typeof window === "undefined") {
		return;
	}
	onCLS(report);
	onFCP(report);
	onINP(report);
	onLCP(report);
	onTTFB(report);
}
