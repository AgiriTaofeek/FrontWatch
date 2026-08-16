// The control-api <-> web contract for the Navigation transitions API —
// same reasoning as network.ts. Grouped by (fromRoute, toRoute), not
// navigationType (push/replace/pop) — "how do users move between
// routes" doesn't care which History API call produced a given
// transition, only that it happened.
export interface NavigationTransitionSummary {
	// null only for a transition whose from_route was never sent at all
	// — packages/sdk's navigation.ts never actually produces this in
	// practice (it only fires a navigation event once there *is* a real
	// previous route), but the wire contract allows it, so this stays
	// honest about that rather than assuming it can't happen.
	fromRoute: string | null;
	toRoute: string;
	transitionCount: number;
	lastSeenAt: string;
}

export interface ListNavigationTransitionsResponse {
	transitions: NavigationTransitionSummary[];
}
