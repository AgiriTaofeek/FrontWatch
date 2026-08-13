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

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/platform/config"
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
	mux.HandleFunc("POST /ingest/v1/events", ingestHandler(service))

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
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

		result, err := service.Ingest(r.Context(), publicKey, req)
		if err != nil {
			if errors.Is(err, telemetry.ErrInvalidCredential) {
				// Same response whether the key is wrong or just
				// disabled — internal/storage/postgres already made
				// this call once, staying consistent with it here.
				writeError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "invalid or inactive project credential", requestID)
				return
			}
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), requestID)
			return
		}

		resp := ingestResponsePayload{
			Accepted:  result.Accepted,
			Rejected:  result.Rejected,
			RequestID: requestID,
		}
		for _, rejection := range result.Rejections {
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
