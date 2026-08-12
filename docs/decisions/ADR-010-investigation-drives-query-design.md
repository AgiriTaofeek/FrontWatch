# ADR-010 — Investigation Workflows Drive Query Architecture, Not Write Optimization Alone

## Status
Accepted

## Decision
Derive the query architecture from actual investigation workflows (what an engineer needs to see, in what sequence, during a real incident) rather than optimizing storage purely for ingest throughput and treating query shape as an afterthought.

## Rationale
A storage system optimized only for writes can still produce a poor observability product if investigations are slow — and investigation speed is the product's core value proposition (`01-project/strategy.md` §6, Time to Understanding). An issue investigation view needs issue metadata + trend + top affected routes/releases + affected sessions + network/performance evidence assembled coherently; if the query layer can't do that efficiently, the write-side optimization doesn't matter.

## Consequence
`05-architecture/data-model.md` §5 (query matrix) is the actual input to indexing/partitioning decisions (§6-7), not the reverse. `05-architecture/system-architecture.md` §9 requires the query architecture to avoid forcing multiple sequential high-latency requests just to render one investigation view.
