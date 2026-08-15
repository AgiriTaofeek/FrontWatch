package main

import "github.com/prometheus/client_golang/prometheus"

// ADR-026's worker-specific slice of operations.md's "core metrics per
// service": worker throughput (records consumed/processed/failed) and
// processing latency. No queue-depth/consumer-lag metric yet — that
// needs a Kafka admin-client call franz-go doesn't do for free, a real
// separate piece of work tracked as deferred (ADR-026), not silently
// skipped.
var (
	recordsConsumedTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "worker_records_consumed_total",
		Help: "Total records fetched from the raw telemetry topic.",
	})

	recordsProcessedTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "worker_records_processed_total",
		Help: "Total records successfully processed and persisted to ClickHouse.",
	})

	recordsFailedTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "worker_records_failed_total",
		Help: "Total records that failed processing, by failure kind.",
	}, []string{"reason"})

	// batchPersistDuration replaces what used to be
	// worker_processing_duration_seconds ("time to decode, process, and
	// persist one record") — real load testing (PROGRESS.md's Step 9
	// Load testing entry) found one-record-at-a-time ClickHouse inserts
	// capped steady-state throughput at ~220-250 events/sec, so
	// cmd/worker now batches everything from a single PollFetches call
	// into one WriteBatch call. Keeping the old per-record name would
	// be actively misleading now that one observation covers however
	// many events were in the batch — batchSize below is what tells
	// you how many.
	batchPersistDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "worker_batch_persist_duration_seconds",
		Help:    "Time to persist one ClickHouse batch (all events from a single PollFetches call).",
		Buckets: prometheus.DefBuckets,
	})

	batchSize = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "worker_batch_size",
		Help:    "Number of events in each ClickHouse batch write.",
		Buckets: prometheus.ExponentialBuckets(1, 2, 12), // 1, 2, 4, ... 2048
	})
)

func init() {
	prometheus.MustRegister(
		recordsConsumedTotal,
		recordsProcessedTotal,
		recordsFailedTotal,
		batchPersistDuration,
		batchSize,
	)
}
