# FrontWatch — Definition of Ready / Done & Technical Debt

**Status:** Draft · Consolidates: legacy `definition-of-ready.md` + `definition-of-done.md` + `technical-debt-strategy.md` (kept as one copy each, deduped from `20-engineering-roadmap/` and `21-engineering-tasks/`, which had near-identical versions of all three)

## Definition of Ready

A story is ready when: the business outcome is understood · acceptance criteria are defined · UX/design is available where required · the API contract is known · dependencies are identified · security implications are considered · the test approach is understood.

## Definition of Done

A story is done when: implementation is complete · acceptance criteria pass · tests pass · security implications are addressed · logging/metrics exist where needed · documentation is updated where needed · code is reviewed · CI passes. Production-critical work also considers rollback and performance impact explicitly, not as an afterthought.

## Technical debt strategy

Track debt by type: correctness, architecture, performance, security, test, documentation. Prioritize debt that blocks delivery, creates security risk, causes incidents, limits scale, or creates repeated engineering cost. **Do not use an unbounded generic "tech debt" bucket** — create explicit backlog items with a stated impact, so debt competes for priority on the same terms as feature work instead of living in a junk drawer nobody revisits.
