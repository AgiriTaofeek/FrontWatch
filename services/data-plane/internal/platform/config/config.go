// Package config loads and validates ingestion's startup configuration.
// code-structure.md is explicit: "if required configuration is invalid,
// log a clear error and exit; never start in a partially-configured
// state" — so Load() returns an error the caller is expected to treat
// as fatal, rather than a Config with silently-empty fields.
package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	// Port the HTTP server listens on.
	Port string
	// DatabaseURL is Postgres, read-only from ingestion's side — see
	// ADR-022. Same database Bun/Drizzle owns and migrates; ingestion
	// never writes to it.
	DatabaseURL string
	// RedpandaBrokers is a comma-separated list, split into individual
	// broker addresses.
	RedpandaBrokers []string
}

var (
	ErrMissingDatabaseURL     = errors.New("DATABASE_URL is required")
	ErrMissingRedpandaBrokers = errors.New("REDPANDA_BROKERS is required")
)

const defaultPort = "8080"

func Load() (Config, error) {
	cfg := Config{
		Port:        envOrDefault("PORT", defaultPort),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, ErrMissingDatabaseURL
	}

	brokers := os.Getenv("REDPANDA_BROKERS")
	if brokers == "" {
		return Config{}, ErrMissingRedpandaBrokers
	}
	cfg.RedpandaBrokers = strings.Split(brokers, ",")

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
