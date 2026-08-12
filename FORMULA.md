# The Product Docs Formula

**A reusable documentation structure for taking any product from idea → business analysis → UX/UI → frontend/backend engineering, without duplication, drift, or planning past the point of usefulness.**

This file is product-agnostic. Copy it into any new project's root and follow it. `docs/` in *this* repo (FrontWatch) is the first real instantiation of it. `legacy-docs/` is the 406-file, 22-phase version that came before it — kept for reference, not deleted, because real thinking happened there. This formula is the distilled lesson from what worked in it and what didn't.

---

## 1. What was wrong with the old approach

The legacy structure had 22 sequential phase-folders, one file per sub-heading of a textbook SDLC outline. In practice that produced:

- **26 duplicated filenames** across folders (`risk-register.md`, `mvp-backlog.md`, `information-architecture.md`...), several with genuinely different, already-diverging content — two sources of truth for one fact.
- **Dead stubs** — a whole folder (`05-user-requirements/`) left half-empty (`_TODO: fill in this document_`) because the process moved on to a better-placed folder (`06-ux-ui/`) and nothing was deleted.
- **A stack decision (Bun vs. Go) that changed mid-project but only propagated forward**, leaving 3+ earlier documents contradicting the later ones.
- **406 files / ~41K lines before a single line of product code existed**, most of it well-organized but unvalidated speculation formatted with the same confidence as settled fact.
- **No build gate.** The one document that mattered most for actually shipping — a one-page "smallest end-to-end slice that proves the idea" — existed, but was buried at phase 21 of 22, after nearly everything else had already been written.

None of this means planning is bad. It means **volume and granularity must be sized to the cost of being wrong**, not to how many sub-headings a taxonomy has.

---

## 2. Core rules

1. **One file per concept, forever.** If you're about to create a second file with the same name or same job in a different folder, that's a sign the second folder shouldn't own a copy — link to the first one instead.
2. **Every file must answer a named decision or question.** If you can't say what decision a document unblocks, don't write it yet.
3. **Docs are append-only decision logs where possible, living summaries everywhere else.** Decisions (ADRs) get new entries, never rewritten history. Strategy/spec docs get edited in place and carry a `Status` line (`Draft` / `Active` / `Superseded by X`) — never forked into `-v2` files.
4. **There is a mandatory build gate.** After Phase 1 and 2 (below), before deep architecture and specs, you must define and — ideally — actually build the smallest end-to-end slice that tests the core bet. Everything after the gate should be informed by what that slice taught you.
5. **Depth follows risk, not taxonomy.** A telemetry data model that's expensive to redo later deserves real depth. A future SSO/SCIM integration that isn't being built for a year deserves one bullet point, not a document.
6. **No empty scaffolding.** Don't pre-create a file until you're about to write real content into it. An empty file with a heading is worse than no file — it looks finished from the folder listing.
7. **Non-goals are cheap and high-value — always write them.** One short "what this deliberately is not" section per phase-1 doc prevents most scope creep before it starts.

---

## 3. The structure

Eight phase folders plus one cross-cutting decision log. Every phase folder starts with its own `README.md` stating its purpose and the question it exists to answer — no numbered "current step" ceremony, no phase gets marked "done forever," because in practice you'll revisit earlier phases as you learn.

```text
docs/
├── 01-project/              Why this exists, for whom, and what we're betting on
├── 02-product/              What we're building, in what order, and why
├── 03-business-analysis/    The business rules, epics, and stories engineering builds from
├── 04-ux-ui/                How users actually experience it
├── 05-architecture/         The technical shape: system, data, stack, contracts, security
├── 06-engineering-specs/    Implementation-level specs, one subfolder per surface being built
├── 07-delivery/             Roadmap, backlog, risk register, test strategy — singular, not duplicated
├── 08-operations-release/   How it deploys, stays healthy, and reaches customers
└── decisions/               ADR log — the one place "why did we choose X" lives, ever
```

### 01-project/ — *Why does this exist?*

| File | Answers |
|---|---|
| `charter.md` | What is this, who is it for, what's the business case, what are we explicitly not building |
| `problem.md` | Who has the problem, what happens today, why it's expensive, root causes |
| `strategy.md` | Vision, ICP, value proposition, positioning, principles, one success metric — **one file**, not nine |

Merges the legacy `01-discovery/` + `02-strategy/` (16 files → 3).

### 02-product/ — *What are we building, and in what order?*

| File | Answers |
|---|---|
| `prd.md` | Product requirements: features, priorities, acceptance bar |
| `mvp.md` | The smallest version that proves the strategy's bet — **this is the build-gate document** |
| `roadmap.md` | What comes after MVP, and the explicit ordering logic |

Merges legacy `04-product-requirements/` + the MVP-relevant parts of `19-release-and-launch/` + `20-engineering-roadmap/`'s strategic (non-task) content.

### 03-business-analysis/ — *What are the rules and stories engineering builds from?*

| File | Answers |
|---|---|
| `brd.md` | Business rules, constraints, compliance requirements |
| `domain-glossary.md` | Shared vocabulary — entities, terms, what they mean |
| `epics.md` | The epic breakdown, priority, dependency graph |
| `user-stories/` | One file per epic, stories + acceptance criteria inside it (not one file per story) |

Merges legacy `03-business-analysis/` + `05-user-requirements/` + `07-data-domain/`'s glossary content.

### 04-ux-ui/ — *How do users actually experience this?*

| File | Answers |
|---|---|
| `principles.md` | UX principles, product surfaces, states every screen must handle |
| `information-architecture.md` | Structure, navigation, hierarchy |
| `workflows/` | One file per critical user workflow (investigation loop, onboarding, etc.) |
| `design-system.md` | Visual/component language, once it exists |

Merges legacy `05-user-requirements/`'s UX-shaped files + `06-ux-ui/` (which already did this well — carried forward almost as-is).

### 05-architecture/ — *What's the technical shape?*

| File | Answers |
|---|---|
| `system-architecture.md` | Components, boundaries, how data flows end to end |
| `data-model.md` | Entities, relationships, retention, partitioning — domain model **and** logical model together |
| `tech-stack.md` | Concrete technology choices, with links into `decisions/` for the *why* |
| `api-contracts.md` | Every API boundary, request/response shape, auth model |
| `security-architecture.md` | Threat model, trust boundaries, tenant isolation, data protection |

Merges legacy `07-data-domain/` + `08-architecture/` + `09-data-model/` + `10-technology-stack/` + `11-api-contracts/` + the architectural parts of `16-security-and-compliance/` (70+ files → 5, with `decisions/` absorbing every ADR that used to live scattered across `08-` and `10-`).

### 06-engineering-specs/ — *What exactly are we implementing?*

One subfolder per surface actually being built — **not one for every surface the product could ever have.** For FrontWatch that's:

```text
06-engineering-specs/
├── sdk/           Browser SDK spec (core, framework adapters, privacy, sampling)
├── frontend/       Dashboard implementation spec
├── control-plane/  TypeScript/Bun service spec
└── data-plane/     Go ingestion/processing spec
```

A product without an SDK just wouldn't have that subfolder. This is the one phase where the *number* of subfolders is genuinely product-specific; the rule is still one file per concept inside each.

Merges legacy `12-sdk-specification/` + `13-backend-implementation/` + `14-frontend-implementation/` + `22-implementation-specifications/`.

### 07-delivery/ — *How does this actually get built, and what could go wrong?*

| File | Answers |
|---|---|
| `roadmap.md` | Phased delivery plan, milestones |
| `backlog.md` | The single backlog — no second copy anywhere else |
| `risk-register.md` | The single risk register — no second copy anywhere else |
| `test-strategy.md` | Test pyramid, quality gates, what "done" means |
| `definition-of-done.md` | One shared bar, referenced everywhere, defined once |

Merges legacy `17-testing-and-quality/` + `20-engineering-roadmap/` + `21-engineering-tasks/` — **this is exactly where the old structure duplicated `risk-register.md`, `mvp-backlog.md`, `definition-of-done.md`, `definition-of-ready.md`, `backlog-structure.md`, `post-mvp-roadmap.md`, `release-milestones.md`, `roadmap-governance.md`, and `technical-debt-strategy.md` across two folders. Here there is exactly one of each.**

### 08-operations-release/ — *How does it deploy, stay healthy, and reach customers?*

| File | Answers |
|---|---|
| `infrastructure.md` | Deployment topology, environments |
| `observability.md` | How the product monitors itself |
| `security-hardening.md` | Operational security practices (secrets, upgrades, backups) |
| `release-strategy.md` | Release channels, pilot process, launch checklist |

Merges legacy `15-infrastructure-and-devops/` + `18-observability-and-operations/` + `19-release-and-launch/`'s operational content.

### decisions/ — *Why did we choose X, and is that choice still current?*

Exactly the legacy ADR pattern, kept unchanged because it already worked: one file per decision, `Status` field that can point forward (`Superseded by ADR-00N`), short and dated. This folder is the **only** place "why" lives — architecture/spec docs describe *what*, and link here for *why*.

---

## 4. The build gate

Between `02-product/mvp.md` and everything in `05-architecture/` + `06-engineering-specs/`, there is a mandatory checkpoint:

> **Define the smallest end-to-end path that tests the product's core bet. Before writing deep architecture for anything beyond it, either build that path or explicitly decide not to yet — but make the decision, don't drift past it.**

This was the single best artifact in the legacy docs (`first-vertical-slice.md` / "Golden MVP Scenario") and it was buried at phase 21 of 22. In this formula it lives inside `02-product/mvp.md` itself, at the top, where it can't be missed.

---

## 5. Sizing guide

| Phase | Target size for a small/mid product |
|---|---|
| 01-project | 3 files, ~6–10 pages total |
| 02-product | 3 files, ~6–10 pages |
| 03-business-analysis | ~4 files + 1 per epic, dense not decorative |
| 04-ux-ui | ~4–6 files |
| 05-architecture | 5 files, as deep as the risk of getting them wrong justifies |
| 06-engineering-specs | Only subfolders for surfaces being actively built |
| 07-delivery | 5 files, single copy of each |
| 08-operations-release | 4 files |
| decisions/ | As many as real decisions were made — this is the one folder allowed to grow freely |

Rough budget: **≤15–20 documents before the first line of code**, for a small-to-mid product. Regulated/complex domains can justify more depth in `05-architecture/`, but the file *count* discipline still holds — depth goes into fewer, denser files, not more files.

---

## 6. Reusing this for the next product

1. Copy this `FORMULA.md` and the empty `docs/` folder skeleton into the new project.
2. Fill `01-project/` and `02-product/mvp.md` first. Nothing else until those exist.
3. Hit the build gate. Actually build the thin slice before going deep on `05-architecture/`.
4. Fill `03-business-analysis/`, `04-ux-ui/`, `05-architecture/`, `06-engineering-specs/` only for what the *next* build increment needs — not the whole product's eventual surface.
5. Every time you make a technology or design decision that took real deliberation, write it once in `decisions/` and never again anywhere else.
6. If you ever find yourself creating a file with a name that already exists elsewhere in `docs/`, stop — merge into the existing one instead.
7. Write `docs/README.md` (see §7) as soon as more than a couple of the phase folders have real content — don't let people guess the reading order from the file tree.

---

## 7. `docs/README.md` — the navigation hub, not just an index

A file tree is not a reading order. Different readers need different paths through the same 40-odd files, and nobody should have to reconstruct that path from the folder structure — write it down once, in `docs/README.md`.

**Required shape:**

- **A "Reading paths by role/purpose" table** — one row per realistic reader (new engineer about to write code, product/BA work, UX work, architecture review, security review, release prep, an AI agent picking the project up cold), each row an ordered list of files/sections, not whole folders. "Read `05-architecture/`" is not a path; "read `system-architecture.md`, then `data-model.md`, then `tech-stack.md`" is.
- **A one-line folder map** — what each top-level folder answers, for the rare full-review case.
- **"One-file answers"** — the single file to hand someone who asks "what is this product," "what are we building first," "why did we choose X" — the fastest possible answers to the three questions everyone actually asks.

**Rules that keep it from rotting:**

- Every path in the table names specific files (and section numbers where useful, e.g. "`mvp.md` §1"), never just a folder — a folder-level pointer stops being a "path" the moment the folder has more than two files in it.
- Update it in the same edit that adds or removes a file from a path referenced in it — treat it as part of the file being changed, not a separate cleanup task.
- Don't duplicate the folder-purpose table that already exists in the root `README.md` — link to one from the other; pick `docs/README.md` as the canonical copy since it sits next to what it's describing.
- This file earns its keep once `docs/` crosses roughly 15-20 files — below that, a file tree is genuinely enough and a navigation hub is premature ceremony (same "depth follows risk" logic as §2 rule 5).
