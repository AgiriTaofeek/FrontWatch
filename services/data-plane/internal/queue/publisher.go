// Package queue publishes accepted telemetry to Redpanda. Ingestion's
// only job here is "durably enqueue" — normalization, fingerprinting,
// and enrichment happen downstream in the worker (services.md's
// telemetry processing pipeline), not here. Publishing the *raw*
// decoded event, nothing more.
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

// recordDeliveryTimeout bounds how long franz-go will keep retrying one
// record before giving up, overriding its own unlimited-by-default
// retry policy. Real chaos testing (Failure recovery, PROGRESS.md's
// Step 9 entry) found that with the previous default, killing Redpanda
// mid-request left an ingestion HTTP request hanging past a 20-second
// client-side cutoff with no sign of ever returning — the exact
// "no retry storms during a FrontWatch outage" failure mode
// system-architecture.md warns about. cmd/ingestion/main.go's own
// per-request context timeout is the primary bound (it governs the
// whole request regardless of batch size); this is a second,
// independent one at the client level, so a caller that ever
// constructs a Publisher and forgets to pass a bounded context still
// can't produce an unbounded hang.
//
// requestRetryTimeout bounds a second, separate mechanism found while
// chasing an intermittent chaos-test failure: RecordDeliveryTimeout
// only bounds *record* delivery, not the client's generic *request*
// retries (metadata refreshes chief among them) — franz-go's own docs
// name a 30s built-in default for those, and repeated Redpanda outages
// against the same long-lived client (chaostest's own scenarios running
// back-to-back hit this, not any single isolated test) were observed
// taking noticeably longer to recover from on later outages than the
// first one, consistent with per-call context cancellation not
// reliably reaching every internal retry loop a produce call can
// trigger. Setting this explicitly, rather than trusting the
// documented default, makes the bound this codebase's own choice
// instead of an assumption about franz-go's internals.
const (
	recordDeliveryTimeout = 10 * time.Second
	requestRetryTimeout   = 10 * time.Second
)

// RawTelemetryTopic — tech-stack.md's conceptual topic list names
// telemetry.raw as the pre-processing topic; telemetry.errors/
// telemetry.performance etc. are the worker's normalized output, not
// ingestion's concern.
const RawTelemetryTopic = "telemetry.raw"

type Publisher struct {
	client *kgo.Client
}

func NewPublisher(brokers []string) (*Publisher, error) {
	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		// Local/MVP: topics aren't provisioned ahead of time yet (that's
		// a deliberate infra step for later, per ADR-013's "exact
		// structure to be validated by load testing" — auto-creation
		// isn't the production answer, just the pragmatic one for now).
		kgo.AllowAutoTopicCreation(),
		kgo.RecordDeliveryTimeout(recordDeliveryTimeout),
		kgo.RetryTimeout(requestRetryTimeout),
	)
	if err != nil {
		return nil, fmt.Errorf("creating redpanda client: %w", err)
	}
	return &Publisher{client: client}, nil
}

func (p *Publisher) Close() {
	p.client.Close()
}

// Ping reports whether at least one Redpanda broker is currently
// reachable — the readiness check ingestion's /health/ready uses
// (ADR-026). A thin wrapper, not a new capability: kgo.Client already
// does exactly this.
func (p *Publisher) Ping(ctx context.Context) error {
	return p.client.Ping(ctx)
}

// PublishEvent publishes one raw event, keyed by projectID so every
// event for one project lands on the same partition — preserves
// per-project ordering downstream, while still spreading load across
// partitions by project.
//
// ProduceSync runs in its own goroutine, raced against ctx.Done(),
// rather than being awaited directly — a hard backstop found necessary
// the hard way (Failure recovery, PROGRESS.md's Step 9 entry):
// RecordDeliveryTimeout and RetryTimeout above bound ProduceSync in
// the ordinary case, but repeated chaos-testing runs — killing
// Redpanda mid-request against the same long-lived client, over and
// over — occasionally left ProduceSync blocked well past every one of
// those configured bounds *and* past ctx's own deadline, non-
// deterministically (reproduced via `bash -x`, confirmed the HTTP
// request was still genuinely unanswered 40+ seconds in, not a test
// artifact). Racing the call against ctx.Done() guarantees this
// function — and so the HTTP request waiting on it — always returns
// within the caller's deadline regardless of what franz-go is doing
// internally. The abandoned goroutine is bounded by the same
// RecordDeliveryTimeout/RetryTimeout either way and eventually exits
// on its own; its result is simply discarded once nobody's listening.
func (p *Publisher) PublishEvent(ctx context.Context, projectID string, event telemetry.Event) error {
	value, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshaling event: %w", err)
	}

	record := &kgo.Record{
		Topic: RawTelemetryTopic,
		Key:   []byte(projectID),
		Value: value,
	}

	resultCh := make(chan error, 1)
	go func() {
		results := p.client.ProduceSync(ctx, record)
		resultCh <- results.FirstErr()
	}()

	select {
	case err := <-resultCh:
		return err
	case <-ctx.Done():
		return fmt.Errorf("publish abandoned, context done: %w", ctx.Err())
	}
}
