import { Elysia } from "elysia";
import { SESSION_COOKIE_NAME } from "./auth";
import { resolveSessionPrincipal } from "./sessionPrincipal";

// Resolves the authenticated principal (if any) once per request and
// exposes it as `principal` on every route's context — mounted with
// `.as("global")` so it applies to every route merged into the `api`
// sub-app via `.use()`, not just routes defined directly on this
// plugin's own instance (confirmed empirically necessary, same
// gotcha ADR-026 already documented for lib/metrics.ts).
//
// `principal` is `null`, not an error, when there's no valid session
// — routes decide for themselves whether that's acceptable
// (lib/authorization.ts's `authorizeProjectAccess`/
// `authorizeOrganizationAccess` both return 401 for a null
// principal), the same "authentication is a separate concern from
// authorization" split auth.md requires.
//
// Named (`{ name: "auth-plugin" }`) so Elysia's plugin deduplication
// kicks in — every route file calls `.use(authPlugin())` itself
// (needed purely for each file's own TypeScript type to know
// `principal` exists in its context; Elysia's type inference only
// tracks a derive within the same instance's own chain, even though
// `.as("global")` already makes it work at runtime through index.ts's
// composition). Without a shared name, each of those calls would
// instantiate its own separate derive, and the underlying session
// lookup would run once per route file merged into one request
// instead of once per request — confirmed empirically that naming
// the instance is what makes Elysia treat repeated
// `.use(authPlugin())` calls as the same plugin, not separate ones.
export function authPlugin() {
	return new Elysia({ name: "auth-plugin" }).derive(
		{ as: "global" },
		async ({ cookie }) => {
			const raw = cookie[SESSION_COOKIE_NAME]?.value;
			const token = typeof raw === "string" ? raw : undefined;
			const principal = await resolveSessionPrincipal(token);
			return { principal };
		},
	);
}
