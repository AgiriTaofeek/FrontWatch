import type { Breadcrumb, BreadcrumbCategory } from "./event";

// instrumentation.md §Breadcrumbs: "Storage is bounded (last N
// breadcrumbs)" — a ring buffer, not an ever-growing array. This trail
// is attached to every captured error's payload (client.ts), not
// stored/transmitted independently, per the design confirmed with the
// user: breadcrumbs are context for an error ("what happened leading up
// to this"), not yet a standalone queryable event type. Sentry's own
// default is 100; halved here since the trail rides along inside every
// error payload rather than being sent once on its own.
const MAX_BREADCRUMBS = 50;

let trail: Breadcrumb[] = [];

// Shared by every automatic instrumentation module (navigation.ts,
// interactions.ts, network.ts) and client.ts's own error-breadcrumb
// recording — one place that enforces the bound, so no caller can
// accidentally grow the trail unbounded.
export function recordBreadcrumb(
	category: BreadcrumbCategory,
	message: string,
	data?: Record<string, unknown>,
): void {
	trail.push({
		category,
		message,
		timestamp: new Date().toISOString(),
		data,
	});
	if (trail.length > MAX_BREADCRUMBS) {
		trail = trail.slice(trail.length - MAX_BREADCRUMBS);
	}
}

// instrumentation.md: `frontwatch.addBreadcrumb(...)` — the one
// developer-facing manual API, always category "custom" (the other
// five categories are only ever recorded by this SDK's own automatic
// instrumentation, never by a direct caller).
export function addBreadcrumb(
	message: string,
	data?: Record<string, unknown>,
): void {
	recordBreadcrumb("custom", message, data);
}

// A copy, not the live array — client.ts attaches this to an error's
// payload, and callers must never be able to mutate the internal trail
// through that reference.
export function getBreadcrumbTrail(): Breadcrumb[] {
	return [...trail];
}

// Test-only reset. bun:test runs every file in one shared process, so
// this module's state would otherwise leak between test files the same
// way errors.test.ts/network.test.ts's mock.module() gotcha already
// documented for a different kind of shared state.
export function __resetBreadcrumbsForTests(): void {
	trail = [];
}
