# Build context must be services/data-plane:
#
#   docker build -f migrations/clickhouse/Dockerfile -t frontwatch-clickhouse-migrate .
#   (run from services/data-plane/)
#
# Mirrors what CI already does (.github/workflows/ci.yml) to apply
# these same migrations during the Go test job — golang-migrate's own
# CLI, not a hand-rolled runner, so this is exactly the tool actually
# tested against these migration files, not a second implementation
# that could drift.
FROM golang:1.26-alpine AS builder
RUN go install -tags 'clickhouse' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates
COPY --from=builder /go/bin/migrate /usr/local/bin/migrate
COPY migrations/clickhouse /migrations
# CLICKHOUSE_MIGRATE_DSN carries the full golang-migrate DSN
# (clickhouse://host:port?username=...&password=...&database=...&
# x-multi-statement=true) — a single connection string is simpler to
# wire through docker-compose environment than five separate vars for
# a one-shot init step that isn't the long-running worker/ingestion
# services (which do take five separate CLICKHOUSE_* vars, matching
# their own config.go).
ENTRYPOINT ["sh", "-c", "migrate -database \"$CLICKHOUSE_MIGRATE_DSN\" -path /migrations up"]
