import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_FILTER_BAR_VALUE, FilterBar } from "./FilterBar";

describe("FilterBar", () => {
	it("calls onChange immediately when the time range selection changes", () => {
		const onChange = mock((_value: unknown) => {});
		render(<FilterBar value={DEFAULT_FILTER_BAR_VALUE} onChange={onChange} />);

		fireEvent.change(screen.getByLabelText("Time range"), {
			target: { value: "24h" },
		});

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith({ preset: "24h", release: "" });
	});

	it("does not call onChange on every keystroke in the release field", () => {
		const onChange = mock((_value: unknown) => {});
		render(<FilterBar value={DEFAULT_FILTER_BAR_VALUE} onChange={onChange} />);

		fireEvent.change(screen.getByPlaceholderText("e.g. 4.2.0"), {
			target: { value: "4.2.0" },
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	it("commits the release filter on blur", () => {
		const onChange = mock((_value: unknown) => {});
		render(<FilterBar value={DEFAULT_FILTER_BAR_VALUE} onChange={onChange} />);

		const input = screen.getByPlaceholderText("e.g. 4.2.0");
		fireEvent.change(input, { target: { value: "4.2.0" } });
		fireEvent.blur(input);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith({ preset: "all", release: "4.2.0" });
	});

	it("commits the release filter on Enter", () => {
		const onChange = mock((_value: unknown) => {});
		render(<FilterBar value={DEFAULT_FILTER_BAR_VALUE} onChange={onChange} />);

		const input = screen.getByPlaceholderText("e.g. 4.2.0");
		fireEvent.change(input, { target: { value: "4.2.0" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("does not commit again on blur if the value hasn't changed since the last commit", () => {
		const onChange = mock((_value: unknown) => {});
		render(<FilterBar value={DEFAULT_FILTER_BAR_VALUE} onChange={onChange} />);

		const input = screen.getByPlaceholderText("e.g. 4.2.0");
		fireEvent.blur(input);

		expect(onChange).not.toHaveBeenCalled();
	});

	it("hides the release filter when showReleaseFilter is false", () => {
		render(
			<FilterBar
				value={DEFAULT_FILTER_BAR_VALUE}
				onChange={() => {}}
				showReleaseFilter={false}
			/>,
		);

		expect(screen.queryByPlaceholderText("e.g. 4.2.0")).toBeNull();
		expect(screen.getByLabelText("Time range")).toBeDefined();
	});
});
