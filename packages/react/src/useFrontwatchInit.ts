import { type InitOptions, init } from "@frontwatch/sdk";

// Deliberately NOT a useEffect. The original version of this hook used
// one, reasoning that "effects never run during SSR" was enough to make
// this safe — true, but incomplete, and a real bug this session's own
// end-to-end check caught, not a hypothetical one: an effect only runs
// *after* the whole tree has already rendered and committed once, which
// is too late if something below this call throws during that very
// first render. React calls an error boundary's componentDidCatch as
// part of the synchronous commit phase, strictly *before* any passive
// effect (useEffect) fires — so a FrontwatchErrorBoundary wrapping a
// subtree that throws on mount would call captureException() before
// init() had ever run, and client.ts's own "no client yet" guard would
// silently drop exactly the "crashes on first render" errors that
// matter most. Confirmed directly: a real, unmocked render of
// <FrontwatchErrorBoundary><Bomb/></FrontwatchErrorBoundary> alongside
// this hook logged "captureException() called before init() —
// dropping" with the useEffect-based version.
//
// Calling init() directly in the render body instead fixes this:
// rendering is top-down, so a parent component's own body always runs
// before React attempts to render any of its children — including one
// that's about to throw. This still doesn't run during SSR, but via the
// explicit typeof window guard below, not via useEffect's timing.
//
// Safe to call unconditionally on every render specifically because
// init() is a real idempotent singleton (client.ts: a second call is a
// no-op that returns the existing client without re-registering
// instrumentation) — repeated calls after the first cost one cheap
// guard check, not a re-initialization.
export function useFrontwatchInit(options: InitOptions): void {
	if (typeof window !== "undefined") {
		init(options);
	}
}
