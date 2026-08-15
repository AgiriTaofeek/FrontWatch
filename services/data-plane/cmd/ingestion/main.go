package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/config"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/health"
	platformmetrics "github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/metrics"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/queue"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/storage/postgres"
	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pool.Close()

	publisher, err := queue.NewPublisher(cfg.RedpandaBrokers)
	if err != nil {
		log.Fatalf("redpanda: %v", err)
	}
	defer publisher.Close()

	credentials := postgres.NewProjectCredentialRepository(pool)
	service := telemetry.NewIngestService(credentials, publisher)

	mux := http.NewServeMux()
	const ingestRoute = "POST /ingest/v1/events"
	mux.Handle(ingestRoute, platformmetrics.InstrumentHandler(
		ingestRoute, httpRequestsTotal, httpRequestDuration, ingestHandler(service),
	))

	health.Register(mux, map[string]health.Checker{
		"postgres": func(ctx context.Context) error { return pool.Ping(ctx) },
		"redpanda": publisher.Ping,
	})
	mux.Handle("GET /metrics", promhttp.Handler())

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
		// Real chaos testing (Failure recovery, PROGRESS.md's Step 9
		// entry) found this server previously had no timeouts at all —
		// a killed Redpanda left a real request hanging past a
		// 20-second client-side cutoff with no sign of ever returning.
		// ingestHandler's own per-request context timeout is the
		// primary, graceful bound (it lets an in-flight publish loop
		// fail its remaining events cleanly and still return a normal
		// response); these are the blunter connection-level backstop —
		// set comfortably longer so the graceful path fires first in
		// the ordinary case.
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("ingestion listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	// Graceful shutdown: stop accepting new requests, finish in-flight
	// ones, only then close dependencies (deferred above, so they run
	// after this) — operations.md is explicit that shutdown must never
	// hang indefinitely, hence the bounded timeout.
	<-ctx.Done()
	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

type ingestResponsePayload struct {
	Accepted   int                `json:"accepted"`
	Rejected   int                `json:"rejected"`
	RequestID  string             `json:"request_id"`
	Rejections []rejectionPayload `json:"rejections,omitempty"`
}

type rejectionPayload struct {
	EventID string `json:"event_id"`
	Code    string `json:"code"`
}

type errorResponsePayload struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id"`
}

// requestProcessingTimeout bounds telemetry.IngestService.Ingest's
// entire run for one request — see the call site's comment.
const requestProcessingTimeout = 15 * time.Second

// ingestHandler is deliberately thin, per services.md's rule: handlers
// parse input and map responses, never business rules — everything
// that matters happens in telemetry.IngestService.
func ingestHandler(service *telemetry.IngestService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requestID := generateRequestID()

		publicKey, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			writeError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "missing or malformed Authorization header", requestID)
			return
		}

		var req telemetry.IngestRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "malformed request body", requestID)
			return
		}

		// Bounds the whole request regardless of batch size or which
		// dependency is slow — the credential check and every event's
		// publish attempt all share this one deadline, rather than each
		// getting its own timeout that could stack into an unbounded
		// total for a large batch. See this file's http.Server comment
		// and internal/queue's recordDeliveryTimeout for the other two
		// layers of the same fix.
		ctx, cancel := context.WithTimeout(r.Context(), requestProcessingTimeout)
		defer cancel()

		result, err := service.Ingest(ctx, publicKey, req)
		if err != nil {
			switch {
			case errors.Is(err, telemetry.ErrInvalidCredential):
				// Same response whether the key is wrong or just
				// disabled — internal/storage/postgres already made
				// this call once, staying consistent with it here.
				writeError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "invalid or inactive project credential", requestID)
			case errors.Is(err, telemetry.ErrDependencyUnavailable):
				// Real chaos testing (Failure recovery, PROGRESS.md's
				// Step 9 entry) found this case used to be
				// indistinguishable from the one above — a Postgres
				// outage produced the identical 401 a bad key would,
				// which packages/sdk's transport.ts then correctly (per
				// its own rules) never retried. 503 tells the caller
				// this is retryable; operations.md's own transport
				// mapping names this exact code for "dependency
				// unavailable."
				writeError(w, http.StatusServiceUnavailable, "DEPENDENCY_UNAVAILABLE", "temporarily unable to process this request, retry shortly", requestID)
			default:
				writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), requestID)
			}
			return
		}

		eventsAcceptedTotal.Add(float64(result.Accepted))

		resp := ingestResponsePayload{
			Accepted:  result.Accepted,
			Rejected:  result.Rejected,
			RequestID: requestID,
		}
		for _, rejection := range result.Rejections {
			eventsRejectedTotal.WithLabelValues(rejection.Code).Inc()
			resp.Rejections = append(resp.Rejections, rejectionPayload{
				EventID: rejection.EventID,
				Code:    rejection.Code,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func bearerToken(header string) (string, bool) {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false
	}
	token := strings.TrimPrefix(header, prefix)
	if token == "" {
		return "", false
	}
	return token, true
}

func writeError(w http.ResponseWriter, status int, code, message, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponsePayload{
		Error: errorBody{Code: code, Message: message, RequestID: requestID},
	})
}

func generateRequestID() string {
	return "req_" + randomHex(12)
}

func randomHex(n int) string {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		// crypto/rand failing would mean a broken system entropy source
		// — exceptionally rare. request_id is diagnostic, not
		// security-critical, so fall back rather than fail the request
		// over it.
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(bytes)
}
