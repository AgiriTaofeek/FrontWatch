# Build context must be services/data-plane (the Go module root), not
# this directory:
#
#   docker build -f cmd/ingestion/Dockerfile -t frontwatch-ingestion .
#   (run from services/data-plane/)
#
# infrastructure.md's containerization spec: minimal base image, only
# required binaries, deterministic build, health endpoints exposed
# (ADR-026's /health/live, /health/ready on this same port), non-root.
FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CGO_ENABLED=0: a fully static binary — none of this module's
# dependencies (pgx, franz-go) need cgo, confirmed by this building
# cleanly; a static binary is what makes a minimal runtime base (no
# libc version to match) safe to use at all.
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/ingestion ./cmd/ingestion

FROM alpine:3.22 AS runtime
# ca-certificates: Postgres/Redpanda connections can be configured for
# TLS (a self-hosted operator's choice, not this image's), and a
# minimal base has no CA bundle by default unlike a full distro.
RUN apk add --no-cache ca-certificates \
	&& adduser -D -u 1000 ingestion
COPY --from=builder /out/ingestion /usr/local/bin/ingestion
USER ingestion
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/ingestion"]
