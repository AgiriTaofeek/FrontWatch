# Workflow — Release Investigation

**Goal:** determine whether a deployment introduced a production regression.

**Flow:** Releases → select release → release health → compare previous release → errors → performance → affected routes → affected sessions → deployment timeline.

**Key question:** did this release change production behavior? The UI should make before/after comparison easy — this is one of the most important investigation questions in the whole product (see `01-project/problem.md` §6).
