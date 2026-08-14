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
});
