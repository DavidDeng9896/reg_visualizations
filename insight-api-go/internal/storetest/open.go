package storetest

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	_ "github.com/go-sql-driver/mysql"
)

// Open returns a Store on a unique MariaDB database that is dropped after the test.
func Open(t testing.TB) *store.Store {
	t.Helper()
	base := store.ConfigFromEnv()
	base.DSN = ""
	name := fmt.Sprintf("insight_test_%d_%d", os.Getpid(), time.Now().UnixNano())
	admin := base
	admin.Database = ""
	adb, err := sql.Open("mysql", admin.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = adb.Close() }()
	if err := adb.Ping(); err != nil {
		t.Fatalf("MariaDB not reachable at %s:%d: %v\nStart: cd insight-api-go && docker compose up -d", base.Host, base.Port, err)
	}
	qName := "`" + strings.ReplaceAll(name, "`", "") + "`"
	if _, err := adb.Exec("CREATE DATABASE " + qName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"); err != nil {
		t.Fatalf("CREATE DATABASE %s: %v (grant CREATE to user %s)", name, err, base.User)
	}
	cfg := base
	cfg.Database = name
	st, err := store.Open(cfg)
	if err != nil {
		_, _ = adb.Exec("DROP DATABASE " + qName)
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = st.Close()
		db, err := sql.Open("mysql", admin.FormatDSN())
		if err != nil {
			return
		}
		_, _ = db.Exec("DROP DATABASE " + qName)
		_ = db.Close()
	})
	return st
}
