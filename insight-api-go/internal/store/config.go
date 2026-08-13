package store

import (
	"fmt"
	"os"
	"strconv"
	"time"

	mysqldriver "github.com/go-sql-driver/mysql"
)

const (
	DefaultHost     = "127.0.0.1"
	DefaultPort     = 3306
	DefaultUser     = "insight"
	DefaultPassword = "insight"
	DefaultName     = "insight"
	DefaultDataDir  = "data"
)

// Config is a MariaDB connection. DSN, if set, wins over discrete fields.
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	DSN      string
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func ConfigFromEnv() Config {
	port := DefaultPort
	if raw := os.Getenv("INSIGHT_DB_PORT"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err == nil && n > 0 {
			port = n
		}
	}
	return Config{
		Host:     getenv("INSIGHT_DB_HOST", DefaultHost),
		Port:     port,
		User:     getenv("INSIGHT_DB_USER", DefaultUser),
		Password: getenv("INSIGHT_DB_PASSWORD", DefaultPassword),
		Database: getenv("INSIGHT_DB_NAME", DefaultName),
		DSN:      os.Getenv("INSIGHT_DB_DSN"),
	}
}

func DataDirFromEnv() string {
	if v := os.Getenv("INSIGHT_DATA_DIR"); v != "" {
		return v
	}
	return DefaultDataDir
}

func (c Config) FormatDSN() string {
	if c.DSN != "" {
		return c.DSN
	}
	cfg := mysqldriver.NewConfig()
	cfg.User = c.User
	cfg.Passwd = c.Password
	cfg.Net = "tcp"
	cfg.Addr = fmt.Sprintf("%s:%d", c.Host, c.Port)
	cfg.DBName = c.Database
	cfg.ParseTime = false
	cfg.Timeout = 12 * time.Second
	cfg.ReadTimeout = 60 * time.Second
	cfg.WriteTimeout = 60 * time.Second
	cfg.Params = map[string]string{
		"charset":          "utf8mb4",
		"collation":        "utf8mb4_unicode_ci",
		"loc":              "UTC",
		"maxAllowedPacket": "67108864",
		"clientFoundRows":  "true",
	}
	return cfg.FormatDSN()
}
