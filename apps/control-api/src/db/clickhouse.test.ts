import { describe, expect, it } from "bun:test";
import {
	parseClickHouseTimeRangeQuery,
	toClickHouseDateTime64,
} from "./clickhouse";

describe("toClickHouseDateTime64", () => {
	it("converts a Date to ClickHouse's own DateTime64(3) string shape, not ISO-8601", () => {
		const date = new Date("2026-08-17T09:15:30.123Z");
		expect(toClickHouseDateTime64(date)).toBe("2026-08-17 09:15:30.123");
	});
});

describe("parseClickHouseTimeRangeQuery", () => {
	it("converts a real ISO-8601 from/to pair from an HTTP query param", () => {
		expect(
			parseClickHouseTimeRangeQuery({
				from: "2026-08-17T00:00:00.000Z",
				to: "2026-08-17T12:00:00.000Z",
			}),
		).toEqual({
			from: "2026-08-17 00:00:00.000",
			to: "2026-08-17 12:00:00.000",
		});
	});

	it("returns undefined for an unset from/to, not a crash or an empty string", () => {
		expect(parseClickHouseTimeRangeQuery({})).toEqual({
			from: undefined,
			to: undefined,
		});
	});

	it("ignores an unparseable from/to rather than sending garbage to ClickHouse", () => {
		expect(
			parseClickHouseTimeRangeQuery({ from: "not-a-date", to: "also-not" }),
		).toEqual({ from: undefined, to: undefined });
	});

	it("handles from and to independently — one bad, one good", () => {
		expect(
			parseClickHouseTimeRangeQuery({
				from: "not-a-date",
				to: "2026-08-17T12:00:00.000Z",
			}),
		).toEqual({ from: undefined, to: "2026-08-17 12:00:00.000" });
	});
});
