package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/issue"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/config"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/health"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/queue"
	chstorage "github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/storage/clickhouse"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

// defaultMetricsPort — the worker has never had an HTTP server before
// (a pure consumer loop); ADR-026 gives it one now, purely for
// /health/live, /health/ready, and /metrics, on its own port so it
// never collides with ingestion's.
const defaultMetricsPort = "8081"

// batchWriter is the minimal surface runLoop/processFetch/
// persistBatchWithRetry need from *chstorage.EventWriter — defined
// consumer-side, the same convention internal/telemetry's
// CredentialValidator/Publisher interfaces already use, specifically
// so persistBatchWithRetry's retry/backoff logic (Failure recovery,
// PROGRESS.md's Step 9 entry) can be unit-tested against a fake that
// fails on command, rather than only being provable against a real
// ClickHouse connection.
type batchWriter interface {
	WriteBatch(ctx context.Context, events []chstorage.StoredEvent) error
}

// fingerprinterAdapter satisfies telemetry.Fingerprinter — a one-line
// wrapper, not a redundant interface: internal/telemetry must never
// import internal/issue directly (keeps the dependency direction
// one-way, code-structure.md), so the concrete algorithm gets wired in
// here instead, at the one place that's allowed to know about both.
type fingerprinterAdapter struct{}

func (fingerprinterAdapter) Fingerprint(exceptionType, message string) (string, uint16) {
	return issue.Fingerprint(exceptionType, message)
}

func main() {
	cfg, err := config.LoadWorkerConfig()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	chConn, err := chstorage.NewConnection(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUsername, cfg.ClickHousePassword)
	if err != nil {
		log.Fatalf("clickhouse: %v", err)
	}
	defer func() {
		if err := chConn.Close(); err != nil {
			log.Printf("closing clickhouse connection: %v", err)
		}
	}()
	writer := chstorage.NewEventWriter(chConn)

	client, err := kgo.NewClient(
		kgo.SeedBrokers(cfg.RedpandaBrokers...),
		kgo.ConsumerGroup("telemetry-worker"),
		kgo.ConsumeTopics(queue.RawTelemetryTopic),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
		// Manual commit — see the processing loop below for why: commits
		// happen one record at a time, strictly in order, only after a
		// successful ClickHouse write, so a crash never silently skips
		// past a record that was never actually persisted.
		kgo.DisableAutoCommit(),
	)
	if err != nil {
		log.Fatalf("redpanda consumer: %v", err)
	}
	defer client.Close()

	service := telemetry.NewProcessEventService(fingerprinterAdapter{})

	metricsServer := startMetricsServer(chConn, client)

	log.Println("worker consuming from", queue.RawTelemetryTopic)
	runLoop(ctx, client, service, writer)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := metricsServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("metrics server shutdown failed: %v", err)
	}

	log.Println("worker shut down")
}

// startMetricsServer wires ADR-026's /health/live, /health/ready, and
// /metrics onto their own HTTP server — the worker's first ever HTTP
// endpoint, purely for observability, never for consuming events.
func startMetricsServer(chConn driver.Conn, redpanda *kgo.Client) *http.Server {
	mux := http.NewServeMux()
	health.Register(mux, map[string]health.Checker{
		"clickhouse": chConn.Ping,
		"redpanda":   redpanda.Ping,
	})
	mux.Handle("GET /metrics", promhttp.Handler())

	port := os.Getenv("WORKER_METRICS_PORT")
	if port == "" {
		port = defaultMetricsPort
	}

	server := &http.Server{Addr: ":" + port, Handler: mux}
	go func() {
		log.Printf("worker metrics listening on :%s", port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("metrics server: %v", err)
		}
	}()
	return server
}

// runLoop is services.md's worker loop: receive → decode → validate →
// process → persist → ack — batched per PollFetches call, not one
// record at a time. Real load testing (PROGRESS.md's Step 9 Load
// testing entry) found the original one-record-at-a-time version
// capped steady-state processing at ~220-250 events/sec against
// ingestion's demonstrated 1000+ events/sec, leaving a real traffic
// spike's queue lag unbounded for 15+ minutes — exactly the failure
// mode test-strategy.md's load-testing success criteria warns against.
// Batching by "whatever one PollFetches call returned," not a custom
// timer/size accumulator across multiple polls: franz-go already
// adapts fetch size to available data, so light traffic naturally
// yields small batches (low latency) and heavy traffic naturally
// yields large ones (high throughput) with no extra buffering,
// goroutine, or timer for this to get wrong.
//
// Bounded concurrency (processing multiple fetches in parallel via a
// worker pool) is still deliberately deferred — one fetch at a time
// is simplest-correct for this slice, and the docs' own
// bounded-concurrency requirement is about never spawning *unbounded*
// goroutines, not a mandate that there must be any concurrency at all.
func runLoop(ctx context.Context, client *kgo.Client, service *telemetry.ProcessEventService, writer batchWriter) {
	for {
		if ctx.Err() != nil {
			return
		}

		fetches := client.PollFetches(ctx)
		if ctx.Err() != nil {
			return
		}
		if errs := fetches.Errors(); len(errs) > 0 {
			for _, fetchErr := range errs {
				log.Printf("fetch error on %s[%d]: %v", fetchErr.Topic, fetchErr.Partition, fetchErr.Err)
			}
			continue
		}

		processFetch(ctx, fetches.Records(), client, service, writer)
	}
}

// processFetch decodes and validates every record from one
// PollFetches call, writes everything that decoded/validated
// successfully as a single ClickHouse batch, and — only if that
// write succeeds — commits through the fetch's last offset. Kafka's
// committed offset is a single watermark per partition, not a sparse
// per-record set, so committing the last record implicitly marks
// every earlier one in this fetch done too; that's exactly why a
// batch persist failure must leave the *whole* fetch uncommitted
// (WriteBatch's own comment covers why this is still as safe as the
// previous one-record-at-a-time discipline, just applied to N records
// instead of 1) — there is no partial-commit position to resume from
// partway through a batch.
func processFetch(ctx context.Context, records []*kgo.Record, client *kgo.Client, service *telemetry.ProcessEventService, writer batchWriter) {
	if len(records) == 0 {
		return
	}

	batch := make([]chstorage.StoredEvent, 0, len(records))
	for _, record := range records {
		recordsConsumedTotal.Inc()
		if stored, ok := decodeRecord(record, service); ok {
			batch = append(batch, stored)
		}
	}

	if len(batch) > 0 {
		batchSize.Observe(float64(len(batch)))

		if err := persistBatchWithRetry(ctx, writer, batch, records[0].Offset, records[len(records)-1].Offset); err != nil {
			// Only returns an error if ctx was cancelled (worker
			// shutting down) while a retry was still in flight — not a
			// permanent give-up, see persistBatchWithRetry's own
			// comment. Leave this fetch uncommitted; the next process
			// start redelivers it from the last committed offset, same
			// as any other in-flight-at-shutdown fetch.
			log.Printf("shutting down while retrying a batch of %d events (offsets %d-%d), leaving it uncommitted for redelivery",
				len(batch), records[0].Offset, records[len(records)-1].Offset)
			return
		}
		recordsProcessedTotal.Add(float64(len(batch)))
	}

	last := records[len(records)-1]
	if err := client.CommitRecords(ctx, last); err != nil {
		log.Printf("commit failed for offset %d: %v", last.Offset, err)
	}
}

// batchRetryBaseDelay/batchRetryMaxDelay bound the exponential backoff
// between retry attempts for a batch ClickHouse won't accept.
// batchWriteAttemptTimeout bounds each individual attempt, so a
// ClickHouse that's reachable but hanging (rather than fast-failing
// with connection-refused, the only failure mode locally stoppable
// containers actually reproduce — see loadtest/README.md's own caveat
// about what chaos testing against Docker can and can't simulate)
// can't turn "retry forever" into "hang forever within one attempt."
const (
	batchRetryBaseDelay      = 500 * time.Millisecond
	batchRetryMaxDelay       = 30 * time.Second
	batchWriteAttemptTimeout = 10 * time.Second
)

// persistBatchWithRetry keeps trying writer.WriteBatch until it
// succeeds or ctx is cancelled (worker shutdown) — never abandoning a
// batch after some fixed number of attempts. Real chaos testing
// (Failure recovery, PROGRESS.md's Step 9 entry) found the previous
// single-attempt behavior left a failed batch's offsets uncommitted
// forever unless the worker happened to go through a consumer-group
// rebalance or was manually restarted — neither is a real recovery
// mechanism, just incidental luck, and a live outage without either
// meant permanent, silent data loss. Retrying indefinitely is safe
// specifically because it's the same batch every time: WriteBatch's
// own comment covers why a redelivered/retried batch can't corrupt
// anything (ReplacingMergeTree de-duplicates on merge), and blocking
// this one partition's consumption while retrying is exactly
// system-architecture.md's own backpressure principle — "when
// downstream capacity is constrained, the queue grows and workers
// catch up" — applied to a single stuck batch instead of the whole
// partition.
func persistBatchWithRetry(ctx context.Context, writer batchWriter, batch []chstorage.StoredEvent, firstOffset, lastOffset int64) error {
	delay := batchRetryBaseDelay
	attempt := 0
	for {
		attempt++

		attemptCtx, cancel := context.WithTimeout(ctx, batchWriteAttemptTimeout)
		start := time.Now()
		err := writer.WriteBatch(attemptCtx, batch)
		batchPersistDuration.Observe(time.Since(start).Seconds())
		cancel()

		if err == nil {
			if attempt > 1 {
				log.Printf("recovered: persisted a batch of %d events (offsets %d-%d) after %d attempts",
					len(batch), firstOffset, lastOffset, attempt)
			}
			return nil
		}

		batchRetriesTotal.Inc()
		log.Printf("CRITICAL: failed to persist a batch of %d events (offsets %d-%d), attempt %d, retrying in %s: %v",
			len(batch), firstOffset, lastOffset, attempt, delay, err)

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}

		delay *= 2
		if delay > batchRetryMaxDelay {
			delay = batchRetryMaxDelay
		}
	}
}

// decodeRecord decodes and validates one record. false means a
// permanent failure (malformed JSON, a validation error) that
// redelivery could never fix — still counted as "done" by the caller
// (its offset gets committed along with the rest of the fetch), just
// never added to the batch that gets persisted. Dead-lettering these
// instead of only logging them is deferred, not forgotten
// (PROGRESS.md) — unchanged from before this batching change.
func decodeRecord(record *kgo.Record, service *telemetry.ProcessEventService) (chstorage.StoredEvent, bool) {
	var event telemetry.Event
	if err := json.Unmarshal(record.Value, &event); err != nil {
		log.Printf("decode failed for offset %d: %v", record.Offset, err)
		recordsFailedTotal.WithLabelValues("decode").Inc()
		return chstorage.StoredEvent{}, false
	}

	processed, err := service.Process(event)
	if err != nil {
		log.Printf("invalid event %s at offset %d: %v", event.EventID, record.Offset, err)
		recordsFailedTotal.WithLabelValues("validation").Inc()
		return chstorage.StoredEvent{}, false
	}

	return chstorage.StoredEvent{
		Event:              processed.Event,
		ProjectID:          string(record.Key),
		ServerReceivedAt:   record.Timestamp,
		Fingerprint:        processed.Fingerprint,
		FingerprintVersion: processed.FingerprintVersion,
	}, true
}
