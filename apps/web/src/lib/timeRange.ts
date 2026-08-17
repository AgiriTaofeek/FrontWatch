// US-15.01 "Filter by Time": common ranges + a real custom option, per
// its own acceptance criteria. `db/*.ts`'s query functions already
// accept `from`/`to` ISO strings (Step 7/8's own filter params) — this
// was purely a missing frontend concern, not a backend one.

export type TimeRangePreset = "1h" | "24h" | "7d" | "30d" | "all";

export interface TimeRangeValue {
	preset: TimeRangePreset;
	// Only meaningful when preset === "custom" is added later — kept out
	// of this type for now since there's no custom-range UI yet (see
	// TimeRangeSelect's own comment). Not building a date-range picker
	// speculatively ahead of an actual need for one.
}

export const TIME_RANGE_PRESETS: {
	value: TimeRangePreset;
	label: string;
}[] = [
	{ value: "1h", label: "Last hour" },
	{ value: "24h", label: "Last 24 hours" },
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "all", label: "All time" },
];

const PRESET_MS: Record<Exclude<TimeRangePreset, "all">, number> = {
	"1h": 60 * 60 * 1000,
	"24h": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
};

// `now` is a parameter, not read fresh internally, so a caller
// re-computing this on every render (or a test) gets a stable result
// for the same instant rather than a new `from` on every call — same
// "don't read the clock more than once per real decision" reasoning
// alertEvaluator.ts's own `now` parameter already established server-side.
export function resolveTimeRange(
	preset: TimeRangePreset,
	now: Date = new Date(),
): { from?: string; to?: string } {
	if (preset === "all") {
		return {};
	}
	return {
		from: new Date(now.getTime() - PRESET_MS[preset]).toISOString(),
		to: now.toISOString(),
	};
}
