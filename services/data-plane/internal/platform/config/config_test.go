package config

import (
	"errors"
	"testing"
)

func TestLoad(t *testing.T) {
	t.Run("loads valid config with defaults", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://x")
		t.Setenv("REDPANDA_BROKERS", "localhost:9092")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("Load() = %v, want nil", err)
		}
		if cfg.Port != defaultPort {
			t.Errorf("Port = %q, want default %q", cfg.Port, defaultPort)
		}
		if cfg.DatabaseURL != "postgres://x" {
			t.Errorf("DatabaseURL = %q, want %q", cfg.DatabaseURL, "postgres://x")
		}
		if len(cfg.RedpandaBrokers) != 1 || cfg.RedpandaBrokers[0] != "localhost:9092" {
			t.Errorf("RedpandaBrokers = %v, want [localhost:9092]", cfg.RedpandaBrokers)
		}
	})

	t.Run("splits multiple comma-separated brokers", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://x")
		t.Setenv("REDPANDA_BROKERS", "broker1:9092,broker2:9092")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("Load() = %v, want nil", err)
		}
		if len(cfg.RedpandaBrokers) != 2 {
			t.Fatalf("RedpandaBrokers = %v, want 2 entries", cfg.RedpandaBrokers)
		}
	})

	t.Run("respects an explicit PORT", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://x")
		t.Setenv("REDPANDA_BROKERS", "localhost:9092")
		t.Setenv("PORT", "9999")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("Load() = %v, want nil", err)
		}
		if cfg.Port != "9999" {
			t.Errorf("Port = %q, want %q", cfg.Port, "9999")
		}
	})

	t.Run("fails clearly without DATABASE_URL", func(t *testing.T) {
		// Explicitly cleared, not just left unset — the test must not
		// depend on the ambient shell happening not to have this set.
		t.Setenv("DATABASE_URL", "")
		t.Setenv("REDPANDA_BROKERS", "localhost:9092")

		_, err := Load()
		if !errors.Is(err, ErrMissingDatabaseURL) {
			t.Fatalf("Load() = %v, want error wrapping %v", err, ErrMissingDatabaseURL)
		}
	})

	t.Run("fails clearly without REDPANDA_BROKERS", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://x")
		t.Setenv("REDPANDA_BROKERS", "")

		_, err := Load()
		if !errors.Is(err, ErrMissingRedpandaBrokers) {
			t.Fatalf("Load() = %v, want error wrapping %v", err, ErrMissingRedpandaBrokers)
		}
	})
}

func setWorkerEnv(t *testing.T) {
	t.Helper()
	t.Setenv("REDPANDA_BROKERS", "localhost:9092")
	t.Setenv("CLICKHOUSE_ADDR", "localhost:9000")
	t.Setenv("CLICKHOUSE_DATABASE", "frontwatch")
	t.Setenv("CLICKHOUSE_USERNAME", "frontwatch")
	t.Setenv("CLICKHOUSE_PASSWORD", "frontwatch_dev")
}

func TestLoadWorkerConfig(t *testing.T) {
	t.Run("loads a valid worker config", func(t *testing.T) {
		setWorkerEnv(t)

		cfg, err := LoadWorkerConfig()
		if err != nil {
			t.Fatalf("LoadWorkerConfig() = %v, want nil", err)
		}
		if cfg.DatabaseURL != "" {
			t.Errorf("DatabaseURL = %q, want empty — the worker never touches Postgres", cfg.DatabaseURL)
		}
		if cfg.ClickHouseAddr != "localhost:9000" {
			t.Errorf("ClickHouseAddr = %q, want %q", cfg.ClickHouseAddr, "localhost:9000")
		}
	})

	t.Run("fails clearly without REDPANDA_BROKERS", func(t *testing.T) {
		setWorkerEnv(t)
		t.Setenv("REDPANDA_BROKERS", "")

		_, err := LoadWorkerConfig()
		if !errors.Is(err, ErrMissingRedpandaBrokers) {
			t.Fatalf("LoadWorkerConfig() = %v, want error wrapping %v", err, ErrMissingRedpandaBrokers)
		}
	})

	t.Run("fails clearly without CLICKHOUSE_ADDR", func(t *testing.T) {
		setWorkerEnv(t)
		t.Setenv("CLICKHOUSE_ADDR", "")

		_, err := LoadWorkerConfig()
		if !errors.Is(err, ErrMissingClickHouseAddr) {
			t.Fatalf("LoadWorkerConfig() = %v, want error wrapping %v", err, ErrMissingClickHouseAddr)
		}
	})

	t.Run("fails clearly without CLICKHOUSE_DATABASE", func(t *testing.T) {
		setWorkerEnv(t)
		t.Setenv("CLICKHOUSE_DATABASE", "")

		_, err := LoadWorkerConfig()
		if !errors.Is(err, ErrMissingClickHouseDatabase) {
			t.Fatalf("LoadWorkerConfig() = %v, want error wrapping %v", err, ErrMissingClickHouseDatabase)
		}
	})

	t.Run("fails clearly without credentials", func(t *testing.T) {
		setWorkerEnv(t)
		t.Setenv("CLICKHOUSE_USERNAME", "")

		_, err := LoadWorkerConfig()
		if !errors.Is(err, ErrMissingClickHouseCredentials) {
			t.Fatalf("LoadWorkerConfig() = %v, want error wrapping %v", err, ErrMissingClickHouseCredentials)
		}
	})
}
