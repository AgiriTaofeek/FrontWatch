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

	processingDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "worker_processing_duration_seconds",
		Help:    "Time to decode, process, and persist one record.",
		Buckets: prometheus.DefBuckets,
	})
)

func init() {
	prometheus.MustRegister(
		recordsConsumedTotal,
		recordsProcessedTotal,
		recordsFailedTotal,
		processingDuration,
	)
}
