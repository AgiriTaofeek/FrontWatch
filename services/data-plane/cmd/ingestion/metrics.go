package main

import "github.com/prometheus/client_golang/prometheus"

// ADR-026's ingestion-specific slice of operations.md's "core metrics
// per service": requests, errors, latency, telemetry ingestion
// (accepted/rejected events). route+status only on the HTTP metrics
// (one real route today, but this is what the codebase's other
// services' request metrics look like too, ADR-026); rejection codes
// are the two fixed values telemetry.IngestService actually produces
// ("INVALID_EVENT", "QUEUE_PUBLISH_FAILED"), not an open-ended set.
var (
	httpRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "ingestion_http_requests_total",
		Help: "Total HTTP requests handled by ingestion.",
	}, []string{"route", "status"})

	httpRequestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "ingestion_http_request_duration_seconds",
		Help:    "HTTP request duration in seconds.",
		Buckets: prometheus.DefBuckets,
	}, []string{"route", "status"})

	eventsAcceptedTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "ingestion_events_accepted_total",
		Help: "Total telemetry events accepted and published to the queue.",
	})

	eventsRejectedTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "ingestion_events_rejected_total",
		Help: "Total telemetry events rejected, by reason code.",
	}, []string{"code"})
)

func init() {
	prometheus.MustRegister(
		httpRequestsTotal,
		httpRequestDuration,
		eventsAcceptedTotal,
		eventsRejectedTotal,
	)
}
