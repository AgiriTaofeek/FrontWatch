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
	// Residual flake found after the pool-size fix above: PR #47/#49/#50
	// each hit this CI job's ClickHouse tests failing at the *full*
	// 20000ms bun:test timeout, not queueing (which would show up
	// faster, and scattered across different concurrency levels) - a
	// real hang. @clickhouse/client's own troubleshooting docs name the
	// exact mechanism: Keep-Alive reuses idle sockets, the server closes
	// ones idle past its own timeout, and the client can be unaware and
	// try to reuse a now-dead socket - normally caught by the client's
	// own idle_socket_ttl timer firing first, but that timer can fire
	// late "on CPU-starved machines," which a shared CI runner running
	// Postgres + ClickHouse + this whole test suite concurrently
	// genuinely is. eagerly_destroy_stale_sockets is the client's own
	// documented mitigation for exactly this case - not verified to be
	// the sole cause (a CI-only, load-dependent hang is inherently hard
	// to reproduce and confirm locally), but the only concrete,
	// documented mechanism that actually matches this symptom.
	keep_alive: {
		eagerly_destroy_stale_sockets: true,
	},
	// Defense in depth, not the primary fix: if something does still
	// hang, fail with a clear ClickHouse-client-level error well before
	// CI's 20000ms bun:test timeout, instead of a vague test-runner
	// timeout with no information about which layer actually stalled.
	request_timeout: 15000,
});

// DateTime64(3) query parameters — not just JSONEachRow inserts, the
// same gotcha applies here too — reject ISO-8601's "T"/"Z" and want
// their own "YYYY-MM-DD HH:MM:SS.mmm" instead. Confirmed directly: a
// native Date's toISOString() passed as a {since:DateTime64(3)} query
// param fails with "cannot be parsed ... only 23 of 24 bytes was
// parsed."
export function toClickHouseDateTime64(date: Date): string {
	return date.toISOString().replace("T", " ").replace("Z", "");
}

// This file's own earlier comment noted "every other from/to filter is
// an opaque string passed straight through from an HTTP query param" as
// if that were a settled design choice — it wasn't, it was a real,
// previously-latent bug: db/{issues,network,sessions,performance,
// navigation}.ts's own from/to filters bind straight to a
// {from:DateTime64(3)} query param too (same file, same struct), so a
// real HTTP caller sending standard ISO-8601 (the only format any sane
// API consumer, frontend or otherwise, would send) hits the identical
// "cannot be parsed" rejection above — just never triggered, since
// nothing had ever actually sent a real from/to value through this path
// before the dashboard's own filter UI needed to. Every route with a
// from/to query param converts through this before calling its db-layer
// function, so ListXFilters.from/to themselves stay ClickHouse-ready
// strings (existing test fixtures that construct them directly,
// bypassing the route layer, are unaffected).
export function parseClickHouseTimeRangeQuery(query: {
	from?: string;
	to?: string;
}): { from?: string; to?: string } {
	const parse = (value: string | undefined): string | undefined => {
		if (!value) {
			return undefined;
		}
		const date = new Date(value);
		// An unparseable from/to is a client error worth ignoring rather
		// than crashing the request over — same "don't let a bad optional
		// filter value take down an otherwise-valid request" reasoning
		// db/issues.ts's own defensive breadcrumb parsing already uses,
		// just applied to a query param instead of a stored payload.
		if (Number.isNaN(date.getTime())) {
			return undefined;
		}
		return toClickHouseDateTime64(date);
	};
	return { from: parse(query.from), to: parse(query.to) };
}
