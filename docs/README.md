# FrontWatch — Documentation

This is the navigation hub for `docs/`. For *why* it's shaped this way, read [`../FORMULA.md`](../FORMULA.md) first — this file is the practical "where do I start" companion to it.

Every file states a `Status` at the top and, where it consolidates legacy content, a `Consolidates:` line naming which `legacy-docs/` files it replaces — follow that if you ever need the original, longer-form source.

## Reading paths by role / purpose

Don't read `docs/` folder-by-folder in order unless you're doing a full review. Pick the row that matches what you're trying to do.

| You are... | Read, in this order |
|---|---|
| **New, want the 5-minute version** | [`01-project/charter.md`](01-project/charter.md) (skim) → [`02-product/mvp.md`](02-product/mvp.md) §1 (the golden scenario) |
| **An engineer about to write code** | [`02-product/mvp.md`](02-product/mvp.md) → [`05-architecture/system-architecture.md`](05-architecture/system-architecture.md) → the relevant `06-engineering-specs/<surface>/` folder → skim [`decisions/README.md`](decisions/README.md) for ADRs touching your area |
| **Doing product / business-analysis work** | [`01-project/charter.md`](01-project/charter.md) → [`01-project/problem.md`](01-project/problem.md) → [`01-project/strategy.md`](01-project/strategy.md) → [`02-product/prd.md`](02-product/prd.md) → [`03-business-analysis/epics.md`](03-business-analysis/epics.md) |
| **Doing UX/design work** | [`01-project/strategy.md`](01-project/strategy.md) (ICP/personas) → [`03-business-analysis/epics.md`](03-business-analysis/epics.md) → all of [`04-ux-ui/`](04-ux-ui/) |
| **Reviewing or changing architecture** | [`05-architecture/system-architecture.md`](05-architecture/system-architecture.md) → [`data-model.md`](05-architecture/data-model.md) → [`tech-stack.md`](05-architecture/tech-stack.md) → [`api-contracts.md`](05-architecture/api-contracts.md) → [`security-architecture.md`](05-architecture/security-architecture.md) → [`decisions/`](decisions/) for the *why* behind any of it |
| **Security / compliance review** | [`01-project/problem.md`](01-project/problem.md) §8 → [`05-architecture/security-architecture.md`](05-architecture/security-architecture.md) → [`08-operations-release/security-hardening.md`](08-operations-release/security-hardening.md) → [`decisions/ADR-007`](decisions/ADR-007-privacy-before-transmission.md) |
| **Preparing or operating a release** | all of [`07-delivery/`](07-delivery/) → all of [`08-operations-release/`](08-operations-release/) |
| **Picking this project up cold (including an AI agent)** | [`../FORMULA.md`](../FORMULA.md) → this file → [`01-project/charter.md`](01-project/charter.md) → [`02-product/mvp.md`](02-product/mvp.md) → then whichever row above matches the actual task |

## Folder map

| Folder | Answers |
|---|---|
| [01-project](01-project/) | Why this exists, for whom, what we're betting on |
| [02-product](02-product/) | What we're building, in what order, and why — **`mvp.md` is the build-gate document, read it before any of `05-`/`06-`** |
| [03-business-analysis](03-business-analysis/) | Business rules, epics, and stories engineering builds from |
| [04-ux-ui](04-ux-ui/) | How users actually experience it |
| [05-architecture](05-architecture/) | The technical shape: system, data, stack, contracts, security |
| [06-engineering-specs](06-engineering-specs/) | Implementation-level specs, one subfolder per surface being built |
| [07-delivery](07-delivery/) | Roadmap, backlog, risk register, test strategy |
| [08-operations-release](08-operations-release/) | How it deploys, stays healthy, and reaches customers |
| [decisions](decisions/) | The ADR log — the only place "why did we choose X" lives |

## One-file answers

If you only have time for one file: **what is FrontWatch** → `01-project/charter.md`. **What are we building first** → `02-product/mvp.md`. **What's the data model** → `05-architecture/data-model.md`. **Why did we choose Go/Bun/ClickHouse/etc.** → `decisions/README.md`.
