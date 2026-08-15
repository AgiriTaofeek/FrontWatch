# ADR-027 — Local Email+Password Session Auth for the First Slice (OIDC Deferred)

## Status
Accepted

## Decision
Step 9's first auth slice uses local email+password authentication with server-side sessions (an opaque random token in an `httpOnly` cookie, backed by a Postgres `auth_sessions` table) — not Keycloak/OIDC. Passwords are hashed with `Bun.password` (argon2id, Bun's own default). `tech-stack.md`'s documented eventual direction (an OIDC-compatible identity provider, Keycloak named as the initial self-hosted candidate) is unchanged as the target; this ADR is about what the *first* slice builds, matching `tech-stack.md`'s own "authentication abstraction that can initially use the selected identity mechanism and later support enterprise OIDC/SAML" framing.

## Context
`PROGRESS.md`'s Step 2 entry deliberately deferred this exact decision: *"Auth library decision deferred to Step 9 — do not pull in better-auth or wire up Keycloak/OIDC during Step 2... revisit deliberately (possible ADR) if that changes."* This is that revisit.

`docs/06-engineering-specs/control-plane/auth.md` requires a real session model (login, logout, expiry, **revocation**, rotation) and separates authentication (identity) from authorization (access) conceptually. It does not mandate a specific mechanism for the first slice — "secure cookies/tokens **as appropriate**" and "local auth **where required**" are both explicitly left open.

Two real options existed:
1. **Local email+password**, sessions in Postgres.
2. **Wire up Keycloak/OIDC now**, building directly against the eventual target.

Confirmed with the user before building (this decision has real, hard-to-reverse consequences — the same reasoning Step 8's Alert type/notification scope was confirmed before building, not guessed at): local email+password.

## Rationale
- Keycloak/OIDC needs new infrastructure this project doesn't have yet — a Keycloak instance in the local dev stack and CI, an OIDC client flow, token verification — for a capability (SSO/SAML) `strategy.md` explicitly scopes to a later **"Enterprise"** product stage, not MVP. `mvp.md`'s own P0 list just says "authentication" + RBAC, not "SSO."
- A server-side session (opaque token, DB-backed), not a stateless JWT: `auth.md`'s "revocation" requirement is real and immediate with a session row (delete it, the session is dead everywhere instantly) — a stateless JWT would need an equivalent-complexity blocklist to revoke before its own expiry, which is the same amount of server-side state anyway, just reimplemented.
- `Bun.password` (argon2id), not a separate bcrypt/argon2 dependency: it's already part of the runtime this project is built on, verified directly (not assumed) — `Bun.password.hash`/`.verify` round-tripped correctly against a real password in a throwaway probe before adopting it.
- Session cookie is `httpOnly` + `sameSite: "strict"` — `auth.md`'s "CSRF protection where applicable" is satisfied by `sameSite: "strict"` for this slice, since the dashboard and control-api are same-site and there's no cross-origin session use yet; a dedicated CSRF token scheme is deferred, not built preemptively for a threat model that doesn't exist yet.

## Consequence
`organizations`, `users`, `memberships` (carrying `role`: Administrator/Engineer/Viewer, per `data-model.md` §1 and `api-contracts.md`), and a new `auth_sessions` table are added to the control-plane schema. `POST /api/v1/auth/register` creates an organization *and* its first user as Administrator in one step (matches US-01.01: "creating an org makes the creator an Administrator") — invitation flows (an Administrator adding a second user to an existing org) are real, separate, deferred work, tracked in `PROGRESS.md`, not forgotten.

This slice builds the session mechanism and demonstrates it on the auth routes themselves (`/auth/me` requires a valid session). It does **not** yet enforce authorization on the 14 existing unauthenticated endpoints (issues/network/sessions/performance/releases/alert-rules) or add tenant-isolation tests — that's the deliberately separate next PR (confirmed with the user: identity first, then enforcement), so this PR stays reviewable on its own.

Revisit Keycloak/OIDC when a real enterprise customer needs SSO/SAML — `tech-stack.md`'s abstraction requirement (authentication is a swappable mechanism, authorization is FrontWatch's own and stays the same either way) means adding it later shouldn't require re-deriving the Membership/role model this ADR establishes now.
