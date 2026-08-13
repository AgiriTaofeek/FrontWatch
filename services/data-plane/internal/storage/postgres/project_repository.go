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

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
// internal/telemetry.CredentialValidator expects — this package never
// imports telemetry (no reason to), it just happens to structurally
// satisfy the interface telemetry defines on its own side.
func (r *ProjectCredentialRepository) ValidateCredential(ctx context.Context, publicKey string) (string, error) {
	project, err := r.FindActiveByPublicKey(ctx, publicKey)
	if err != nil {
		return "", err
	}
	return project.ID, nil
}
