import type { FilterBarValue } from "../components/FilterBar";
import { resolveTimeRange } from "./timeRange";

// Shared by every feature's api.ts that wires up FilterBar — one
// definition of "how a FilterBarValue becomes a query string" so the
// five call sites (issues/network/performance/navigation/sessions)
// can't quietly drift, same "one definition, not five" reasoning this
// codebase already applies to its wire contracts.
export function buildFilterQueryString(
	filters: FilterBarValue,
	{ includeRelease = true }: { includeRelease?: boolean } = {},
): string {
	const { from, to } = resolveTimeRange(filters.preset);
	const params = new URLSearchParams();
	if (includeRelease && filters.release) {
		params.set("release", filters.release);
	}
	if (from) {
		params.set("from", from);
	}
	if (to) {
		params.set("to", to);
	}
	const query = params.toString();
	return query ? `?${query}` : "";
}
