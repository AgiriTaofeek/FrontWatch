# Failure recovery / chaos testing

Real dependency-outage testing against a live local stack —
`legacy-docs/17-testing-and-quality/failure-testing.md`'s principle
made runnable: *"Dependencies fail. Test what happens when Postgres,
ClickHouse, Redpanda become unavailable — the system should fail
gracefully, expose health status, retry only where safe, avoid retry
storms, preserve durable data where possible, recover automatically
where designed."* See `PROGRESS.md`'s Step 9 "Failure recovery" entry
for the full write-up of what this found and fixed.

Same status as `loadtest/`: **operational tooling, not a CI gate** —
it stops and restarts real Docker containers, which nothing in CI
runs against.

## Prerequisites

Same as `loadtest/README.md`'s: `infra/local/docker-compose.yml` up,
`control-api`/`ingestion`/`worker` running, plus `docker` CLI access
to control the `local-{postgres,clickhouse,redpanda}-1` containers.

## Running

```sh
./chaostest/run-all.sh
```

Provisions a real org/project (reusing `loadtest/provision.sh` and
`loadtest/teardown.sh` directly — no second implementation of the same
thing), runs every scenario in sequence, tears down, prints a
pass/fail summary. Each scenario restores the dependency it stopped
even if the scenario itself fails partway through (`trap cleanup EXIT`
in every script) — a real bug hit once while building this harness:
an early version without that trap left Postgres stopped after one
scenario crashed, cascading into failures for every later scenario
and the final teardown.

### Running one scenario at a time

```sh
./loadtest/provision.sh
source loadtest/.session
./chaostest/scenarios/ingestion-postgres-down.sh
./chaostest/scenarios/ingestion-redpanda-down.sh
./chaostest/scenarios/worker-clickhouse-down.sh
./chaostest/scenarios/control-api-dependency-down.sh postgres
./chaostest/scenarios/control-api-dependency-down.sh clickhouse
./loadtest/teardown.sh
```

## What each scenario proves

- **`ingestion-postgres-down.sh`** — a stopped Postgres (ingestion's
  read-only credential check) returns **503**, not the 401 a
  genuinely bad key produces. That distinction is what makes the
  request retryable: `packages/sdk`'s transport only retries `>= 500`.
- **`ingestion-redpanda-down.sh`** — a stopped Redpanda produces a
  **bounded** response instead of the request hanging indefinitely.
- **`worker-clickhouse-down.sh`** — the most severe one: events sent
  while ClickHouse is down are still all eventually persisted, with
  **zero worker restarts**, once ClickHouse comes back — proving the
  worker actually retries the stuck batch rather than only recovering
  by incidental luck (a consumer-group rebalance) or a manual restart.
- **`control-api-dependency-down.sh <postgres|clickhouse>`** — a
  stopped dependency returns a clean 503 with no leaked internals (no
  raw SQL, stack trace, or connection string in the response body).

## Known limitation

Same caveat as `loadtest/README.md`'s: stopping a local Docker
container produces a fast `connection refused` failure, not a true
network black hole (a connection that never resolves either way).
Timeouts added alongside these fixes (`credentialCheckTimeout`,
`requestProcessingTimeout`, `recordDeliveryTimeout`,
`batchWriteAttemptTimeout`, the ingestion `http.Server`'s own
Read/Write/IdleTimeout) are real and code-reviewable, but this harness
can only empirically prove the fast-fail path, not the slow-hang path
they also defend against.
