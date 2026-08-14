package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/issue"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/config"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/queue"
	chstorage "github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/storage/clickhouse"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

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

	log.Println("worker consuming from", queue.RawTelemetryTopic)
	runLoop(ctx, client, service, writer)
	log.Println("worker shut down")
}

// runLoop is services.md's worker loop: receive → decode → validate →
// process → persist → ack, one record at a time. Bounded concurrency
// (processing multiple records in parallel via a worker pool) is
// deliberately deferred — sequential is simplest-correct for proving
// the pipeline now, and the docs' own bounded-concurrency requirement
// is about never spawning *unbounded* goroutines, not a mandate that
// there must be any concurrency at all yet.
func runLoop(ctx context.Context, client *kgo.Client, service *telemetry.ProcessEventService, writer *chstorage.EventWriter) {
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

		// A plain loop, not EachRecord's callback form — deliberately,
		// so a persist failure can `break` and stop this fetch's
		// processing entirely. Kafka's committed offset is a single
		// watermark per partition, not a sparse per-record set:
		// committing record N+1 implicitly marks N done too, even if N
		// was never actually persisted. EachRecord can't stop early, so
		// it can't prevent that gap — this can.
		for _, record := range fetches.Records() {
			ok := processRecord(ctx, record, service, writer)

			if ok {
				if err := client.CommitRecords(ctx, record); err != nil {
					log.Printf("commit failed for offset %d: %v", record.Offset, err)
				}
				continue
			}

			// Persist failed — stop here, uncommitted. Next PollFetches
			// (this loop or after a restart) redelivers from this exact
			// offset. Retry-with-backoff before giving up entirely is
			// real hardening work, deferred to Step 9, not silently
			// skipped.
			log.Printf("stopping this fetch at offset %d after a persist failure", record.Offset)
			break
		}
	}
}

// processRecord returns whether the caller should commit this record's
// offset and continue — true for success *and* for permanent failures
// (decode/validation: redelivery would never help, so there's nothing
// to wait for), false only for a persist failure, which is the one
// case retrying via redelivery could plausibly fix.
func processRecord(ctx context.Context, record *kgo.Record, service *telemetry.ProcessEventService, writer *chstorage.EventWriter) bool {
	var event telemetry.Event
	if err := json.Unmarshal(record.Value, &event); err != nil {
		// Permanent failure — malformed JSON will never decode
		// successfully on retry. Log and move on (still committed)
		// rather than block the partition forever. Dead-lettering
		// malformed records is deferred, not forgotten (PROGRESS.md).
		log.Printf("decode failed for offset %d: %v", record.Offset, err)
		return true
	}

	processed, err := service.Process(event)
	if err != nil {
		// Also permanent — a validation failure won't fix itself on
		// redelivery either.
		log.Printf("invalid event %s at offset %d: %v", event.EventID, record.Offset, err)
		return true
	}

	stored := chstorage.StoredEvent{
		Event:              processed.Event,
		ProjectID:          string(record.Key),
		ServerReceivedAt:   record.Timestamp,
		Fingerprint:        processed.Fingerprint,
		FingerprintVersion: processed.FingerprintVersion,
	}

	if err := writer.WriteEvent(ctx, stored); err != nil {
		// Retryable — ClickHouse may just be temporarily unavailable.
		// Bounded-retry + circuit-breaking here is real hardening work,
		// deferred to Step 9, not silently skipped — for now, stop and
		// let redelivery (this fetch's caller breaks the loop) try
		// again on the next poll or after a restart.
		log.Printf("CRITICAL: failed to persist event %s at offset %d: %v", event.EventID, record.Offset, err)
		return false
	}

	return true
}
