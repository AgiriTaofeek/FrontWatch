import { recordBreadcrumb } from "./breadcrumbs";

// instrumentation.md §Breadcrumbs' "interaction" category / E07's
// US-07.02: "supported interactions can be captured" + "sensitive input
// values are never captured by default." Click-only for this pass
// (matches the project's existing "cover the common case first, real
// separate work for the rest" split network.ts already used for
// fetch-vs-XHR) — keyboard/scroll/focus interactions are deferred, not
// forgotten.
//
// Describes *what kind of element* was clicked, never its content:
// tag name + id + first class only. No innerText, no value, no
// aria-label — any of those could carry a customer's real data (a
// button labeled with an account holder's name, an input's typed
// value). This is a structural guarantee, not something privacy.ts's
// redaction has to catch after the fact.
function describeTarget(target: EventTarget | null): string {
	if (!(target instanceof Element)) {
		return "unknown";
	}
	const tag = target.tagName.toLowerCase();
	const id = target.id ? `#${target.id}` : "";
	const firstClass = target.classList[0] ? `.${target.classList[0]}` : "";
	return `${tag}${id}${firstClass}`;
}

function handleClick(event: MouseEvent): void {
	recordBreadcrumb("interaction", `Click -> ${describeTarget(event.target)}`);
}

export function registerInteractionInstrumentation(): void {
	// capture: true so this observes the click regardless of whether some
	// deeper handler calls stopPropagation() — same "must never alter
	// application behavior" principle network.ts's fetch wrapper follows,
	// applied to a plain listener instead of a wrapped function: passive
	// means this can never block or slow down the click itself.
	document.addEventListener("click", handleClick, {
		capture: true,
		passive: true,
	});
}
