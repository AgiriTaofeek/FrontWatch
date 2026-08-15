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

	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
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

	results := p.client.ProduceSync(ctx, record)
	return results.FirstErr()
}
