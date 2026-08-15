package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRegister_Live_AlwaysOK(t *testing.T) {
	mux := http.NewServeMux()
	// Liveness must never depend on a checker — pass one that always
	// fails to prove /health/live ignores it entirely.
	Register(mux, map[string]Checker{
		"always-down": func(context.Context) error { return errors.New("down") },
	})

	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRegister_Ready_AllChecksPass(t *testing.T) {
	mux := http.NewServeMux()
	Register(mux, map[string]Checker{
		"postgres": func(context.Context) error { return nil },
	})

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body readyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if body.Checks["postgres"].Status != "up" {
		t.Fatalf("expected postgres check to be up, got %+v", body.Checks["postgres"])
	}
}

func TestRegister_Ready_OneCheckFails(t *testing.T) {
	mux := http.NewServeMux()
	Register(mux, map[string]Checker{
		"postgres": func(context.Context) error { return nil },
		"redpanda": func(context.Context) error { return errors.New("connection refused") },
	})

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	// One failing dependency must fail the whole readiness check — a
	// service isn't "ready" if only some of what it needs is up.
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}

	var body readyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if body.Checks["postgres"].Status != "up" {
		t.Fatalf("expected postgres to still report up, got %+v", body.Checks["postgres"])
	}
	if body.Checks["redpanda"].Status != "down" {
		t.Fatalf("expected redpanda to report down, got %+v", body.Checks["redpanda"])
	}
	if body.Checks["redpanda"].Error != "connection refused" {
		t.Fatalf("expected the underlying error message to surface, got %q", body.Checks["redpanda"].Error)
	}
}
