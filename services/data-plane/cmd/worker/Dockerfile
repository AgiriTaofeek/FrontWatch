# Build context must be services/data-plane (the Go module root), not
# this directory — same reasoning as cmd/ingestion/Dockerfile:
#
#   docker build -f cmd/worker/Dockerfile -t frontwatch-worker .
#   (run from services/data-plane/)
FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/worker ./cmd/worker

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates \
	&& adduser -D -u 1000 worker
COPY --from=builder /out/worker /usr/local/bin/worker
USER worker
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/worker"]
