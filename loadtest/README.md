# Load testing

Real throughput/latency measurement against a live local stack —
`operations.md`'s Load testing spec made runnable: *"ingestion
throughput, processing throughput, query latency, queue lag, storage
insert performance."* See ADR-028 for why k6.

This is **operational tooling, not a CI gate** — same status as
`scripts/backup-postgres.sh`. It needs the full stack up, takes several
minutes, and its output is a point-in-time capacity measurement to be
read and reasoned about, not a pass/fail check to automate. `test-strategy.md`
lists load testing under "conditional, depending on the change" for a
release decision, not "required before any production release."

## Prerequisites

- `infra/local/docker-compose.yml` up (Postgres, ClickHouse, Redpanda)
- `control-api` running on `:3000` (`bun --watch src/index.ts` in `apps/control-api`)
- `ingestion` running on `:8080` and `worker` running on `:8081` (`go run ./cmd/ingestion` / `./cmd/worker` in `services/data-plane`, with `REDPANDA_BROKERS=localhost:19092` — the external listener, not `:9092`)
- [`k6`](https://k6.io) and `jq` on `PATH` (`brew install k6 jq`)

## Running

```sh
./loadtest/run.sh
```

This provisions a real organization/project through the real HTTP
routes (`provision.sh`), runs the ingestion traffic-pattern scenario,
checks Redpanda consumer-group lag and a ClickHouse row count against
what was reported accepted, runs the query-latency scenario against
control-api while a background write load keeps hitting ingestion
concurrently, then tears everything it created back down
(`teardown.sh`) — including on failure (`trap cleanup EXIT`).

Results (k6's JSON summary + raw logs) land in `loadtest/results/`
(gitignored — these are point-in-time local numbers, not something to
commit and let go stale).

### Running scenarios individually

Useful when iterating on one scenario without paying for the full
~5-minute round trip every time:

```sh
./loadtest/provision.sh          # writes loadtest/.session
source loadtest/.session
INGESTION_URL=http://localhost:8080 PUBLIC_KEY="$PUBLIC_KEY" \
  k6 run loadtest/scenarios/ingestion.js

CONTROL_API_URL=http://localhost:3000 PROJECT_ID="$PROJECT_ID" SESSION_COOKIE="$SESSION_COOKIE" \
  k6 run loadtest/scenarios/query.js

./loadtest/teardown.sh
```

## What each scenario measures

- **`scenarios/ingestion.js`** — POSTs batches of 1–10 realistic
  error/network/performance events to `POST /ingest/v1/events` across
  a staged VU ramp matching `test-strategy.md`'s named traffic
  patterns verbatim: normal traffic → peak traffic → incident spike →
  sustained high volume → recovery. Reports accepted/rejected event
  counts, batch success rate, and HTTP latency percentiles.
- **`scenarios/query.js`** — GETs the investigation endpoints
  (issues/network/sessions/performance/releases) under ramping
  concurrent VUs, run by `run.sh` while `scenarios/sustained-ingest.js`
  applies constant background write pressure — `test-strategy.md`'s
  own reasoning: *"monitoring platforms tend to experience their own
  traffic spikes exactly when customer applications are failing,
  which is the worst possible time to discover a capacity problem."*
- **`scenarios/sustained-ingest.js`** — not a scenario in its own
  right; a flat constant-VU background load `run.sh` starts alongside
  `query.js`.

## Known limitation

Every dependency (Postgres, ClickHouse, Redpanda, both Go binaries,
control-api) runs colocated on one laptop for this pass — CPU/memory
contention between them is real and depresses every number below what
separately-hosted services would sustain. Treat these results as "the
platform's logic holds up under a real traffic pattern and recovers
after a spike," not as production capacity-planning numbers. A
proper capacity-planning pass needs the staging/production topology
`infrastructure.md` describes, not a single dev machine.

## Results

See `PROGRESS.md`'s Step 9 entry for the latest numbers and findings.
