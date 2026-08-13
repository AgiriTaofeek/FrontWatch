import type { FrontwatchEvent } from "./event";

// No-op pass-through for now — but this stage must exist in the pipeline
// regardless, not be added later. ADR-007: privacy filtering always runs
// before sampling, before buffering. An event that shouldn't leave the
// browser must never get a chance to be "sampled in" first — so the gate
// has to be structurally present from the start, even while it does
// nothing yet, or a later change risks silently getting the order wrong.
export function applyPrivacy(event: FrontwatchEvent): FrontwatchEvent {
	return event;
}
