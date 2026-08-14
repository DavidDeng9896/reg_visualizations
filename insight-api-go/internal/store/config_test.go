package store_test

import (
	"strings"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

func TestConfigFromEnvDefaults(t *testing.T) {
	t.Setenv("INSIGHT_DB_DSN", "")
	t.Setenv("INSIGHT_DB_HOST", "")
	t.Setenv("INSIGHT_DB_PORT", "")
	t.Setenv("INSIGHT_DB_USER", "")
	t.Setenv("INSIGHT_DB_PASSWORD", "")
	t.Setenv("INSIGHT_DB_NAME", "")
	cfg := store.ConfigFromEnv()
	if cfg.Host != "127.0.0.1" || cfg.Port != 3306 || cfg.User != "insight" || cfg.Database != "insight" {
		t.Fatalf("defaults: %+v", cfg)
	}
}

func TestConfigFromEnvOverrides(t *testing.T) {
	t.Setenv("INSIGHT_DB_HOST", "db.example")
	t.Setenv("INSIGHT_DB_PORT", "3307")
	t.Setenv("INSIGHT_DB_USER", "u")
	t.Setenv("INSIGHT_DB_PASSWORD", "p")
	t.Setenv("INSIGHT_DB_NAME", "n")
	t.Setenv("INSIGHT_DB_DSN", "")
	cfg := store.ConfigFromEnv()
	if cfg.Host != "db.example" || cfg.Port != 3307 || cfg.User != "u" || cfg.Password != "p" || cfg.Database != "n" {
		t.Fatalf("overrides: %+v", cfg)
	}
}

func TestFormatDSNUsesFields(t *testing.T) {
	cfg := store.Config{
		Host: "127.0.0.1", Port: 3306, User: "insight", Password: "secret", Database: "insight",
	}
	dsn := cfg.FormatDSN()
	if !strings.Contains(dsn, "insight:secret@tcp(127.0.0.1:3306)/insight") {
		t.Fatalf("dsn=%s", dsn)
	}
	if !strings.Contains(dsn, "charset=utf8mb4") {
		t.Fatalf("missing charset: %s", dsn)
	}
}

func TestFormatDSNPrefersExplicit(t *testing.T) {
	cfg := store.Config{DSN: "custom:pass@tcp(h:1)/db", Host: "ignored"}
	if cfg.FormatDSN() != "custom:pass@tcp(h:1)/db" {
		t.Fatalf("dsn=%s", cfg.FormatDSN())
	}
}
