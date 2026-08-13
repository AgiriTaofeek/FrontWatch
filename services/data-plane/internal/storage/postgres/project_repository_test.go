package postgres

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Integration test — hits the real local Postgres (same one Bun/Drizzle
// migrates), per data-plane's testing strategy. Skips cleanly if
// DATABASE_URL isn't set (e.g. running `go test ./...` without the local
// stack up) rather than hard-failing; CI always has it set, same pattern
// as apps/control-api's tests.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping Postgres integration test")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("pgxpool.New() = %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func insertTestProject(t *testing.T, pool *pgxpool.Pool, publicKey, status string) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(),
		`INSERT INTO projects (public_key, status) VALUES ($1, $2) RETURNING id`,
		publicKey, status,
	).Scan(&id)
	if err != nil {
		t.Fatalf("insertTestProject: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM projects WHERE id = $1`, id)
	})
	return id
}

func TestProjectCredentialRepository_FindActiveByPublicKey(t *testing.T) {
	pool := testPool(t)
	repo := NewProjectCredentialRepository(pool)

	t.Run("finds an active project by its public key", func(t *testing.T) {
		id := insertTestProject(t, pool, "fw_pk_test_active", "active")

		project, err := repo.FindActiveByPublicKey(context.Background(), "fw_pk_test_active")
		if err != nil {
			t.Fatalf("FindActiveByPublicKey() = %v, want nil", err)
		}
		if project.ID != id {
			t.Errorf("ID = %q, want %q", project.ID, id)
		}
		if project.Status != "active" {
			t.Errorf("Status = %q, want %q", project.Status, "active")
		}
	})

	t.Run("treats a disabled project the same as not found", func(t *testing.T) {
		insertTestProject(t, pool, "fw_pk_test_disabled", "disabled")

		_, err := repo.FindActiveByPublicKey(context.Background(), "fw_pk_test_disabled")
		if !errors.Is(err, ErrProjectNotFound) {
			t.Fatalf("FindActiveByPublicKey() = %v, want %v", err, ErrProjectNotFound)
		}
	})

	t.Run("returns ErrProjectNotFound for a key that doesn't exist", func(t *testing.T) {
		_, err := repo.FindActiveByPublicKey(context.Background(), "fw_pk_does_not_exist")
		if !errors.Is(err, ErrProjectNotFound) {
			t.Fatalf("FindActiveByPublicKey() = %v, want %v", err, ErrProjectNotFound)
		}
	})
}
