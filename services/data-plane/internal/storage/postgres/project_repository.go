// Package postgres is ingestion's read-only access to the projects
// table Bun/Drizzle owns and migrates — see ADR-022. Deliberately one
// narrow, query-oriented interface, not a generic repository: Go never
// writes to control-plane tables, and doesn't need to (services.md:
// "avoid over-abstraction — don't create a generic repository for
// every table merely because an interface is possible").
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/AgiriTaofeek/FrontWatch/services/data-plane/internal/telemetry"
)

// ErrProjectNotFound covers both "no project has this key" and "the
// project exists but is disabled" — deliberately the same error for
// both, so a caller can't distinguish "wrong key" from "right key,
// disabled project" and learn something about a key that isn't theirs.
var ErrProjectNotFound = errors.New("project not found")

type Project struct {
	ID     string
	Status string
}

type ProjectCredentialRepository struct {
	pool *pgxpool.Pool
}

func NewProjectCredentialRepository(pool *pgxpool.Pool) *ProjectCredentialRepository {
	return &ProjectCredentialRepository{pool: pool}
}

func (r *ProjectCredentialRepository) FindActiveByPublicKey(ctx context.Context, publicKey string) (Project, error) {
	var p Project
	err := r.pool.QueryRow(ctx,
		`SELECT id, status FROM projects WHERE public_key = $1`,
		publicKey,
	).Scan(&p.ID, &p.Status)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Project{}, ErrProjectNotFound
		}
		return Project{}, err
	}

	if p.Status != "active" {
		return Project{}, ErrProjectNotFound
	}

	return p, nil
}

// ValidateCredential adapts FindActiveByPublicKey to the shape
// internal/telemetry.CredentialValidator expects. This package does
// import telemetry here — the one exception to "this package never
// imports telemetry," and a deliberate one: an adapter translating its
// own infrastructure-specific errors into the domain-level sentinels
// the port it implements expects is exactly what an adapter is for
// (the dependency still points inward, telemetry -> nothing in this
// package). Real chaos testing (Failure recovery, PROGRESS.md's Step 9
// entry) found that without this translation, a Postgres outage and a
// genuinely wrong public key were indistinguishable by the time they
// reached the HTTP layer — both collapsed into the same "invalid
// credential" outcome. ErrProjectNotFound (a real not-found/inactive
// result) becomes telemetry.ErrInvalidCredential; anything else (a raw
// connection/timeout error) is returned as-is, for
// telemetry.IngestService to recognize as ErrDependencyUnavailable
// instead.
func (r *ProjectCredentialRepository) ValidateCredential(ctx context.Context, publicKey string) (string, error) {
	project, err := r.FindActiveByPublicKey(ctx, publicKey)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return "", telemetry.ErrInvalidCredential
		}
		return "", fmt.Errorf("checking project credential: %w", err)
	}
	return project.ID, nil
}
