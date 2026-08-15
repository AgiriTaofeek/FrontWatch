// Package health wires the two endpoints ADR-026 requires every
// service to expose: /health/live and /health/ready. Shared here
// rather than duplicated per cmd, the way internal/platform/config
// already splits Load per-binary but shares the loader mechanics.
package health

import (
	"context"
	"encoding/json"
	"net/http"
)

// Checker reports whether one dependency this service relies on is
// currently reachable. Each service supplies its own set — ingestion
// checks Postgres, the worker checks ClickHouse + Redpanda — readiness
// is never the same fixed check for every binary.
type Checker func(ctx context.Context) error

type checkResult struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

type readyResponse struct {
	Checks map[string]checkResult `json:"checks"`
}

// Register wires /health/live and /health/ready onto mux.
//
// Liveness never touches a dependency — operations.md's graceful-
// shutdown section draws the same distinction other cloud-native
// services make: a slow Postgres must never make a live process look
// dead to an orchestrator's liveness probe (which would restart a
// perfectly healthy process for someone else's outage).
//
// Readiness runs every checker and reports which ones failed —
// 200 only if all of them succeed, 503 otherwise, with a per-
// dependency breakdown so "what's actually down" is answered directly
// rather than needing a follow-up investigation.
func Register(mux *http.ServeMux, checks map[string]Checker) {
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		resp := readyResponse{Checks: make(map[string]checkResult, len(checks))}
		ready := true

		for name, check := range checks {
			if err := check(r.Context()); err != nil {
				ready = false
				resp.Checks[name] = checkResult{Status: "down", Error: err.Error()}
				continue
			}
			resp.Checks[name] = checkResult{Status: "up"}
		}

		w.Header().Set("Content-Type", "application/json")
		if ready {
			w.WriteHeader(http.StatusOK)
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		_ = json.NewEncoder(w).Encode(resp)
	})
}
