import { createClient } from "@clickhouse/client";

// Read-only from the control plane's side. Bun/control-api never writes
// to ClickHouse — the worker (Go) owns all writes (ADR-023's aggregation
// queries run against data the worker already persisted in Step 5).
// Uses the HTTP interface (8123), not the native protocol (9000) the Go
// side uses — @clickhouse/client's official Node/Bun client is HTTP-only.
function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set`);
	}
	return value;
}

export const clickhouse = createClient({
	url: `http://${requireEnv("CLICKHOUSE_HTTP_ADDR")}`,
	username: requireEnv("CLICKHOUSE_USERNAME"),
	password: requireEnv("CLICKHOUSE_PASSWORD"),
	database: requireEnv("CLICKHOUSE_DATABASE"),
	// This client is a module-level singleton — every *.test.ts file that
	// imports it during a `bun test` run shares this one connection pool.
	// The default (10, @clickhouse/client's own default) was fine when
	// this file was first written, but the test suite has grown a lot
	// since (issues/network/sessions/performance/releases/alerts/tenant
	// isolation all query ClickHouse now) — under CI's constrained CPU,
	// concurrent queries were observed queueing behind that limit long
	// enough to blow past bun:test's 5000ms default per-test timeout, a
	// real, reproducible flake (confirmed: a *different* test times out
	// each run, always in this layer, always right at 5000ms). Raised
	// well above the current suite's real concurrency needs — cheap
	// insurance, not a magic number tuned to the exact failure.
	max_open_connections: 50,
});

// DateTime64(3) query parameters — not just JSONEachRow inserts, the
// same gotcha applies here too — reject ISO-8601's "T"/"Z" and want
// their own "YYYY-MM-DD HH:MM:SS.mmm" instead. Confirmed directly: a
// native Date's toISOString() passed as a {since:DateTime64(3)} query
// param fails with "cannot be parsed ... only 23 of 24 bytes was
// parsed." No existing code in this file converted a real Date before
// this — every other from/to filter is an opaque string passed
// straight through from an HTTP query param — so this is the first
// place that actually needed it.
export function toClickHouseDateTime64(date: Date): string {
	return date.toISOString().replace("T", " ").replace("Z", "");
}
