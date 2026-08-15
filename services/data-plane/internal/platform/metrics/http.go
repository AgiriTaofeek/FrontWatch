// Package metrics holds instrumentation plumbing shared across
// services — the per-service metric names/values themselves live next
// to whichever cmd defines them (ADR-026: every service exposes its
// own /metrics, not a shared registry of everyone's counters).
package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// InstrumentHandler wraps h to record request count and duration,
// labeled by route and status code. `route` is the fixed pattern
// string the caller registered the handler under (e.g. "POST
// /ingest/v1/events"), never derived from the request itself —
// operations.md's explicit caution against high-cardinality metric
// labels (arbitrary URLs, IDs) is enforced by construction here,
// since route can only ever be one of the small fixed set of patterns
// a service actually registers.
func InstrumentHandler(route string, requests *prometheus.CounterVec, duration *prometheus.HistogramVec, h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		h(rec, r)

		elapsed := time.Since(start).Seconds()
		labels := prometheus.Labels{"route": route, "status": strconv.Itoa(rec.status)}
		requests.With(labels).Inc()
		duration.With(labels).Observe(elapsed)
	}
}

// statusRecorder captures the status code a handler actually wrote —
// http.ResponseWriter has no getter for it, and InstrumentHandler
// needs the real value (not an assumed 200) to label failed requests
// correctly.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
