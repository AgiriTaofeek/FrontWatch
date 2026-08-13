package telemetry

import (
	"context"
	"errors"
)

// CredentialValidator resolves a public key to the project it belongs
// to. Defined here, on the consumer side, per Go convention — the
// concrete implementation (internal/storage/postgres) doesn't need to
// know this interface exists; it just happens to satisfy it.
type CredentialValidator interface {
	ValidateCredential(ctx context.Context, publicKey string) (projectID string, err error)
}

// Publisher enqueues one validated raw event for downstream processing
// (normalization/fingerprinting happen in the worker, not here).
type Publisher interface {
	PublishEvent(ctx context.Context, projectID string, event Event) error
}

var ErrInvalidCredential = errors.New("invalid credential")

type Rejection struct {
	EventID string
	Code    string
}

type IngestResult struct {
	Accepted   int
	Rejected   int
	Rejections []Rejection
}

type IngestService struct {
	credentials CredentialValidator
	publisher   Publisher
}

func NewIngestService(credentials CredentialValidator, publisher Publisher) *IngestService {
	return &IngestService{credentials: credentials, publisher: publisher}
}

// Ingest matches api-contracts.md §3's behavior exactly: Authenticate →
// Validate → durably enqueue → acknowledge. Partial acceptance is
// required — one malformed event in a batch of 100 rejects only that
// one, never the whole batch. A batch-level failure (bad credential,
// unsupported schema_version) is the only thing that rejects
// everything, since neither is recoverable per-event.
func (s *IngestService) Ingest(ctx context.Context, publicKey string, req IngestRequest) (IngestResult, error) {
	if err := req.Validate(); err != nil {
		return IngestResult{}, err
	}

	projectID, err := s.credentials.ValidateCredential(ctx, publicKey)
	if err != nil {
		return IngestResult{}, ErrInvalidCredential
	}

	result := IngestResult{}
	for _, event := range req.Events {
		if err := event.Validate(); err != nil {
			result.Rejected++
			result.Rejections = append(result.Rejections, Rejection{EventID: event.EventID, Code: "INVALID_EVENT"})
			continue
		}

		if err := s.publisher.PublishEvent(ctx, projectID, event); err != nil {
			result.Rejected++
			result.Rejections = append(result.Rejections, Rejection{EventID: event.EventID, Code: "QUEUE_PUBLISH_FAILED"})
			continue
		}

		result.Accepted++
	}

	return result, nil
}
