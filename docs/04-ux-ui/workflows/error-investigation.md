# Workflow — Error Investigation

**Goal:** move from a detected error to a root-cause hypothesis quickly.

**Flow:** Application Health → error spike → issue → issue summary → impact → timeline → release correlation → affected sessions → stack trace → network/performance evidence → root-cause hypothesis.

**The issue-summary screen must answer:** what happened? how often? when did it start? is it still happening? who is affected? which routes? which release?

**Evidence attached to an error:** stack trace, release, session, breadcrumbs, network, performance.

**Primary action:** the engineer must be able to move from an issue to the most relevant evidence without manually searching for it.
