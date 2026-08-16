package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Step 10's pilot readiness dry-run found this missing entirely — see
// corsMiddleware's own comment for what broke without it (a real
// browser blocking the SDK's actual telemetry POST after its
// preflight OPTIONS request 405'd).
func TestCorsMiddleware_PreflightOptions(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("inner handler should never run for an OPTIONS preflight")
	})

	req := httptest.NewRequest(http.MethodOptions, "/ingest/v1/events", nil)
	req.Header.Set("Origin", "https://customer-app.example.com")
	rec := httptest.NewRecorder()

	corsMiddleware(inner).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "*")
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got != "POST, OPTIONS" {
		t.Errorf("Access-Control-Allow-Methods = %q, want %q", got, "POST, OPTIONS")
	}
}

func TestCorsMiddleware_ActualRequestStillReachesHandler(t *testing.T) {
	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodPost, "/ingest/v1/events", nil)
	req.Header.Set("Origin", "https://customer-app.example.com")
	rec := httptest.NewRecorder()

	corsMiddleware(inner).ServeHTTP(rec, req)

	if !called {
		t.Error("inner handler was never called for a real POST")
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		// A real browser checks this on the actual response too, not
		// just the preflight.
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "*")
	}
}
