package telemetry

import (
	"context"
	"errors"
	"fmt"
	"time"
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

// ErrDependencyUnavailable means the credential check itself couldn't
// run — Postgres unreachable, a timeout, anything that isn't "this
// specific key is wrong or disabled." Real chaos testing (Failure
// recovery, PROGRESS.md's Step 9 entry) found a Postgres outage was
// previously collapsed into ErrInvalidCredential, which the ingestion
// HTTP handler mapped to 401 — indistinguishable from a genuinely bad
// key. That mapping mattered beyond a wrong status code: 401 is one of
// the statuses packages/sdk's transport.ts deliberately never retries
// (a bad key retrying forever would be pointless), so a real Postgres
// outage caused the SDK to silently drop events instead of retrying
// them the way a 503 already tells it to. This sentinel is what lets
// the credential-check failure path be told apart from the
// bad-credential path, all the way out to the HTTP response.
var ErrDependencyUnavailable = errors.New("dependency unavailable")

// credentialCheckTimeout bounds how long a single request waits on
// ValidateCredential. Without this, a Postgres connection stuck
// somewhere between "not yet failed" and "not yet succeeded" (a
// network partition, not the fast connection-refused a locally
// stopped container produces — chaos testing here could only
// reproduce the fast-fail case, not a true black hole) could hold an
// ingestion request open indefinitely, the exact "no retry storms
// during a FrontWatch outage" / bounded-latency failure mode
// system-architecture.md warns about. Applied around the credential
// check specifically (not the whole request) since that's the one
// synchronous dependency call on ingestion's otherwise
// enqueue-and-acknowledge path.
const credentialCheckTimeout = 3 * time.Second

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

	checkCtx, cancel := context.WithTimeout(ctx, credentialCheckTimeout)
	defer cancel()

	projectID, err := s.credentials.ValidateCredential(checkCtx, publicKey)
	if err != nil {
		if errors.Is(err, ErrInvalidCredential) {
			return IngestResult{}, ErrInvalidCredential
		}
		// Anything else — a raw Postgres error, checkCtx's own deadline
		// exceeded — is this dependency being unavailable, not the
		// caller's key being wrong. CredentialValidator implementations
		// are expected to return ErrInvalidCredential explicitly for a
		// real not-found/inactive result (internal/storage/postgres does
		// this at its own adapter boundary) and their own raw error
		// otherwise, exactly so this distinction can be made here.
		return IngestResult{}, fmt.Errorf("%w: %v", ErrDependencyUnavailable, err)
	}

	result := IngestResult{}
	for _, event := range req.Events {
		// data-model.md §3: "every event carries schema_version" — the
		// wire batch envelope has one, individual events don't declare
		// their own, so it's attached here rather than assumed
		// downstream (the worker consuming from Redpanda has no other
		// way to know it).
		event.SchemaVersion = req.SchemaVersion

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
