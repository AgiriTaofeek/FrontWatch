// Package config loads and validates each binary's startup
// configuration. code-structure.md is explicit: "if required
// configuration is invalid, log a clear error and exit; never start in
// a partially-configured state" — so each Load function returns an
// error the caller is expected to treat as fatal, rather than a Config
// with silently-empty fields.
//
// Two loaders, not one shared "requires everything" struct: ingestion
// needs Postgres (ADR-022) but never ClickHouse; the worker needs
// ClickHouse but never Postgres (all Postgres access is ingestion-only).
// Forcing one Load() to require both would make each binary demand
// configuration it never actually uses.
package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	// Port the HTTP server listens on. Ingestion only.
	Port string
	// DatabaseURL is Postgres, read-only from ingestion's side — see
	// ADR-022. Same database Bun/Drizzle owns and migrates; ingestion
	// never writes to it.
	DatabaseURL string
	// RedpandaBrokers is a comma-separated list, split into individual
	// broker addresses. Needed by both ingestion (publish) and the
	// worker (consume).
	RedpandaBrokers []string
	// ClickHouse — worker only, the raw-event write path.
	ClickHouseAddr     string
	ClickHouseDatabase string
	ClickHouseUsername string
	ClickHousePassword string
}

var (
	ErrMissingDatabaseURL           = errors.New("DATABASE_URL is required")
	ErrMissingRedpandaBrokers       = errors.New("REDPANDA_BROKERS is required")
	ErrMissingClickHouseAddr        = errors.New("CLICKHOUSE_ADDR is required")
	ErrMissingClickHouseDatabase    = errors.New("CLICKHOUSE_DATABASE is required")
	ErrMissingClickHouseCredentials = errors.New("CLICKHOUSE_USERNAME and CLICKHOUSE_PASSWORD are required")
)

const defaultPort = "8080"

// Load is ingestion's config: Postgres (credential validation) +
// Redpanda (publish).
func Load() (Config, error) {
	cfg := Config{
		Port:        envOrDefault("PORT", defaultPort),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, ErrMissingDatabaseURL
	}

	brokers, err := requireBrokers()
	if err != nil {
		return Config{}, err
	}
	cfg.RedpandaBrokers = brokers

	return cfg, nil
}

// LoadWorkerConfig is the worker's config: Redpanda (consume) +
// ClickHouse (write). No DatabaseURL — the worker never touches
// Postgres.
func LoadWorkerConfig() (Config, error) {
	brokers, err := requireBrokers()
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		RedpandaBrokers:    brokers,
		ClickHouseAddr:     os.Getenv("CLICKHOUSE_ADDR"),
		ClickHouseDatabase: os.Getenv("CLICKHOUSE_DATABASE"),
		ClickHouseUsername: os.Getenv("CLICKHOUSE_USERNAME"),
		ClickHousePassword: os.Getenv("CLICKHOUSE_PASSWORD"),
	}

	if cfg.ClickHouseAddr == "" {
		return Config{}, ErrMissingClickHouseAddr
	}
	if cfg.ClickHouseDatabase == "" {
		return Config{}, ErrMissingClickHouseDatabase
	}
	if cfg.ClickHouseUsername == "" || cfg.ClickHousePassword == "" {
		return Config{}, ErrMissingClickHouseCredentials
	}

	return cfg, nil
}

func requireBrokers() ([]string, error) {
	brokers := os.Getenv("REDPANDA_BROKERS")
	if brokers == "" {
		return nil, ErrMissingRedpandaBrokers
	}
	return strings.Split(brokers, ","), nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
