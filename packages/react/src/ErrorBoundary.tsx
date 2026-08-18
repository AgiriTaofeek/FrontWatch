import { addBreadcrumb, captureException } from "@frontwatch/sdk";
import { Component, type ErrorInfo, type ReactNode } from "react";

// mvp.md §5 / ADR-005: this is the React adapter's actual reason to
// exist, not incidental — window.addEventListener("error", ...)
// (packages/sdk/src/errors.ts) does NOT catch errors React itself throws
// during rendering/lifecycle/constructors. React deliberately catches
// those into its own reconciler (that's the whole point of an error
// boundary existing as a concept) rather than letting them surface as
// uncaught browser exceptions — so without this, a real class of
// production errors would be invisible to FrontWatch entirely, not just
// under-instrumented.
//
// Error boundaries are one of the few places React still requires a
// class component (as of React 19) — componentDidCatch/
// getDerivedStateFromError have no hook equivalent.

export interface FrontwatchErrorBoundaryProps {
	children: ReactNode;
	// Rendered instead of children once an error is caught. A function
	// receives the caught error, so the host app can show something
	// useful ("Something went wrong: {error.message}"); a plain ReactNode
	// works for a static fallback. Omitted entirely renders nothing,
	// matching how error boundaries are documented in React itself —
	// this component's job is capturing the error, not deciding the
	// host app's recovery UI for it.
	fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface FrontwatchErrorBoundaryState {
	error: Error | null;
}

export class FrontwatchErrorBoundary extends Component<
	FrontwatchErrorBoundaryProps,
	FrontwatchErrorBoundaryState
> {
	state: FrontwatchErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): FrontwatchErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		// componentStack (which component actually threw) is genuinely
		// useful investigation context that error.stack alone doesn't
		// carry — attached as a breadcrumb rather than folded into the
		// exception itself, since error.stack should stay the real JS
		// stack, not a mix of two different kinds of stack trace.
		addBreadcrumb(
			"React component tree error caught by FrontwatchErrorBoundary",
			info.componentStack ? { componentStack: info.componentStack } : undefined,
		);
		// handled=false: matches errors.ts's own convention for
		// window.onerror/unhandledrejection — the application didn't
		// choose to catch and handle this itself, React's own error
		// boundary mechanism did.
		captureException(error, false);
	}

	render(): ReactNode {
		const { error } = this.state;
		if (!error) {
			return this.props.children;
		}
		const { fallback } = this.props;
		if (typeof fallback === "function") {
			return fallback(error);
		}
		return fallback ?? null;
	}
}
