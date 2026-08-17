import { useState } from "react";
import { TIME_RANGE_PRESETS, type TimeRangePreset } from "../lib/timeRange";

// US-15.01/US-15.03: a shared control for the two E15 sub-parts that
// close without new structural work (see PROGRESS.md — environment and
// browser/device filtering are blocked on deeper prerequisites, not
// built here). One component, reused across Issues/Network/Performance/
// Navigation/Sessions, rather than five near-identical hand-rolled
// filter bars — the acceptance criteria ("filters can be combined")
// only really holds if every page behaves the same way.

export interface FilterBarValue {
	preset: TimeRangePreset;
	release: string;
}

export interface FilterBarProps {
	value: FilterBarValue;
	onChange: (value: FilterBarValue) => void;
	// Sessions has no release filter on the backend (a session spans
	// potentially many releases) — hiding the control there rather than
	// rendering one that would silently do nothing.
	showReleaseFilter?: boolean;
}

export function FilterBar({
	value,
	onChange,
	showReleaseFilter = true,
}: FilterBarProps) {
	// Release is applied on blur/Enter, not on every keystroke — a
	// dedicated local field so typing doesn't refetch on every
	// character. Time range applies immediately on selection, matching
	// how a <select> is a discrete, deliberate choice already.
	const [releaseDraft, setReleaseDraft] = useState(value.release);

	function commitRelease() {
		if (releaseDraft !== value.release) {
			onChange({ ...value, release: releaseDraft });
		}
	}

	return (
		<div>
			<label>
				Time range{" "}
				<select
					value={value.preset}
					onChange={(event) =>
						onChange({
							...value,
							preset: event.target.value as TimeRangePreset,
						})
					}
				>
					{TIME_RANGE_PRESETS.map((preset) => (
						<option key={preset.value} value={preset.value}>
							{preset.label}
						</option>
					))}
				</select>
			</label>
			{showReleaseFilter && (
				<label>
					{" "}
					Release{" "}
					<input
						type="text"
						placeholder="e.g. 4.2.0"
						value={releaseDraft}
						onChange={(event) => setReleaseDraft(event.target.value)}
						onBlur={commitRelease}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								commitRelease();
							}
						}}
					/>
				</label>
			)}
		</div>
	);
}

export const DEFAULT_FILTER_BAR_VALUE: FilterBarValue = {
	preset: "all",
	release: "",
};
