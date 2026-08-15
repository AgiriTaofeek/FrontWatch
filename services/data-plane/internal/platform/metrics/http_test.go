package metrics

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
)

func TestInstrumentHandler_RecordsStatusAndCount(t *testing.T) {
	requests := prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_requests_total"}, []string{"route", "status"})
	duration := prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "test_duration_seconds"}, []string{"route", "status"})

	handler := InstrumentHandler("GET /widgets", requests, duration, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodGet, "/widgets", nil)
	rec := httptest.NewRecorder()
	handler(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected the wrapped handler's own status to reach the client, got %d", rec.Code)
	}

	metric := &dto.Metric{}
	counter, err := requests.GetMetricWithLabelValues("GET /widgets", "201")
	if err != nil {
		t.Fatalf("looking up counter: %v", err)
	}
	if err := counter.Write(metric); err != nil {
		t.Fatalf("reading counter: %v", err)
	}
	if got := metric.GetCounter().GetValue(); got != 1 {
		t.Fatalf("expected the 201-labeled counter to be 1, got %v", got)
	}
}

func TestInstrumentHandler_DefaultsStatusTo200WhenNeverWritten(t *testing.T) {
	requests := prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_requests_total_2"}, []string{"route", "status"})
	duration := prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "test_duration_seconds_2"}, []string{"route", "status"})

	// A handler that never calls WriteHeader implicitly writes 200 on
	// the first Write — statusRecorder's default must match that so a
	// silent-success handler isn't mislabeled.
	handler := InstrumentHandler("GET /widgets", requests, duration, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})

	req := httptest.NewRequest(http.MethodGet, "/widgets", nil)
	rec := httptest.NewRecorder()
	handler(rec, req)

	metric := &dto.Metric{}
	counter, err := requests.GetMetricWithLabelValues("GET /widgets", "200")
	if err != nil {
		t.Fatalf("looking up counter: %v", err)
	}
	if err := counter.Write(metric); err != nil {
		t.Fatalf("reading counter: %v", err)
	}
	if got := metric.GetCounter().GetValue(); got != 1 {
		t.Fatalf("expected the 200-labeled counter to be 1, got %v", got)
	}
}
