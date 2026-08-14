package telemetry

// Fingerprinter computes a stable grouping key for an error event.
// Defined here, consumer-side, same convention as CredentialValidator/
// Publisher — internal/issue's real implementation doesn't need to
// know this interface exists. Keeps the dependency direction one-way:
// telemetry never imports issue, issue's algorithm just happens to
// satisfy what telemetry asks for.
type Fingerprinter interface {
	Fingerprint(exceptionType, message string) (fingerprint string, version uint16)
}

// ProcessedEvent is Normalize→Fingerprint's result, ready to persist.
// Persisting is deliberately not this service's job — which store to
// write to (and what else needs attaching, like project_id from a
// Kafka record key, or server_received_at from a Kafka record
// timestamp) is a wiring concern the worker's consume loop owns, not
// something pure processing logic needs an opinion on.
type ProcessedEvent struct {
	Event              Event
	Fingerprint        string
	FingerprintVersion uint16
}

type ProcessEventService struct {
	fingerprinter Fingerprinter
}

func NewProcessEventService(fingerprinter Fingerprinter) *ProcessEventService {
	return &ProcessEventService{fingerprinter: fingerprinter}
}

// Process runs services.md's Normalize → Fingerprint stages. Normalize
// is a pass-through for this pass — no framework-specific event shapes
// exist yet to normalize (deferred, see PROGRESS.md's Step 5 note).
// Privacy enforcement and enrichment are also deferred, same reason.
func (s *ProcessEventService) Process(event Event) (ProcessedEvent, error) {
	if err := event.Validate(); err != nil {
		return ProcessedEvent{}, err
	}

	processed := ProcessedEvent{Event: event}
	if event.EventType == EventTypeError {
		processed.Fingerprint, processed.FingerprintVersion = s.fingerprinter.Fingerprint(
			event.Payload.ExceptionType,
			event.Payload.Message,
		)
	}

	return processed, nil
}
