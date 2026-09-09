package storetest

import (
	"database/sql"
	"errors"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
)

const defaultFixedTestDB = "insight_test"

// Open returns a Store for integration tests.
//
// Resolution order (test harness only — no production API change):
//  1. INSIGHT_TEST_DSN — use that pre-created database (wipe tables between tests).
//  2. CREATE DATABASE insight_test_<pid>_<nano> via INSIGHT_DB_* (best isolation).
//  3. On MySQL Error 1044 (no CREATE), fall back to fixed DB INSIGHT_TEST_DB
//     (default insight_test), wiping tables under a cross-process file lock.
//  4. If the fixed DB is also unavailable, skip with a clear setup hint.
func Open(t testing.TB) *store.Store {
	t.Helper()

	if dsn := strings.TrimSpace(os.Getenv("INSIGHT_TEST_DSN")); dsn != "" {
		return openSharedDSN(t, dsn)
	}

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
	qName := quoteIdent(name)
	if _, err := adb.Exec("CREATE DATABASE " + qName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"); err != nil {
		if isCreateDatabaseDenied(err) {
			t.Logf("CREATE DATABASE denied for user %q (%v); falling back to fixed test DB", base.User, err)
			return openFixedTestDB(t, base)
		}
		t.Fatalf("CREATE DATABASE %s: %v", name, err)
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

func openFixedTestDB(t testing.TB, base store.Config) *store.Store {
	t.Helper()
	name := strings.TrimSpace(os.Getenv("INSIGHT_TEST_DB"))
	if name == "" {
		name = defaultFixedTestDB
	}
	appDB := base.Database
	if appDB == "" {
		appDB = store.DefaultName
	}
	if name == appDB {
		t.Skipf("MariaDB user %q lacks CREATE DATABASE (Error 1044), and refusing to reuse app DB %q.\n"+
			"Fix: create a dedicated test database and grant access, e.g.\n"+
			"  cd insight-api-go && ./scripts/grant-test-privileges.sh\n"+
			"Or set INSIGHT_TEST_DSN to a pre-created test database DSN.", base.User, appDB)
	}
	cfg := base
	cfg.Database = name
	cfg.DSN = ""
	return openSharedDSN(t, cfg.FormatDSN())
}

func openSharedDSN(t testing.TB, dsn string) *store.Store {
	t.Helper()
	unlock := lockSharedTestDB(t, dsn)

	probe, err := sql.Open("mysql", dsn)
	if err != nil {
		unlock()
		t.Fatal(err)
	}
	if err := probe.Ping(); err != nil {
		_ = probe.Close()
		unlock()
		if isCreateDatabaseDenied(err) || isUnknownDatabase(err) {
			t.Skipf("test database unreachable (%v).\n"+
				"Fix: cd insight-api-go && ./scripts/grant-test-privileges.sh\n"+
				"Or set INSIGHT_TEST_DSN to a DSN the test user can use.\n"+
				"See insight-api-go/README.md §测试.", err)
		}
		t.Fatalf("MariaDB test DSN ping: %v", err)
	}
	if err := resetTables(probe); err != nil {
		_ = probe.Close()
		unlock()
		t.Fatalf("reset test database tables: %v", err)
	}
	_ = probe.Close()

	st, err := store.Open(store.Config{DSN: dsn})
	if err != nil {
		unlock()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = st.Close()
		unlock()
	})
	return st
}

func resetTables(db *sql.DB) error {
	if _, err := db.Exec("SET FOREIGN_KEY_CHECKS=0"); err != nil {
		return err
	}
	rows, err := db.Query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
	if err != nil {
		_, _ = db.Exec("SET FOREIGN_KEY_CHECKS=1")
		return err
	}
	var names []string
	for rows.Next() {
		var name, typ string
		if err := rows.Scan(&name, &typ); err != nil {
			_ = rows.Close()
			_, _ = db.Exec("SET FOREIGN_KEY_CHECKS=1")
			return err
		}
		names = append(names, name)
	}
	_ = rows.Close()
	for _, name := range names {
		if _, err := db.Exec("DROP TABLE IF EXISTS " + quoteIdent(name)); err != nil {
			_, _ = db.Exec("SET FOREIGN_KEY_CHECKS=1")
			return err
		}
	}
	_, err = db.Exec("SET FOREIGN_KEY_CHECKS=1")
	return err
}

func lockSharedTestDB(t testing.TB, dsn string) (unlock func()) {
	t.Helper()
	h := fnv.New64a()
	_, _ = h.Write([]byte(dsn))
	path := filepath.Join(os.TempDir(), fmt.Sprintf("insight-storetest-%x.lock", h.Sum64()))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o666)
	if err != nil {
		t.Fatalf("storetest lock file: %v", err)
	}
	deadline := time.Now().Add(2 * time.Minute)
	for {
		err = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
		if err == nil {
			break
		}
		if !errors.Is(err, syscall.EWOULDBLOCK) && !errors.Is(err, syscall.EAGAIN) {
			_ = f.Close()
			t.Fatalf("storetest flock: %v", err)
		}
		if time.Now().After(deadline) {
			_ = f.Close()
			t.Fatalf("timeout waiting for storetest DB lock %s (another go test holding shared insight_test?)", path)
		}
		time.Sleep(50 * time.Millisecond)
	}
	return func() {
		_ = syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
		_ = f.Close()
	}
}

func quoteIdent(name string) string {
	return "`" + strings.ReplaceAll(name, "`", "") + "`"
}

func isCreateDatabaseDenied(err error) bool {
	var me *mysql.MySQLError
	if errors.As(err, &me) {
		// 1044 Access denied to database; 1045 can appear on some CREATE paths.
		return me.Number == 1044
	}
	msg := err.Error()
	return strings.Contains(msg, "Error 1044") ||
		(strings.Contains(msg, "Access denied") && strings.Contains(strings.ToLower(msg), "database"))
}

func isUnknownDatabase(err error) bool {
	var me *mysql.MySQLError
	if errors.As(err, &me) {
		return me.Number == 1049
	}
	return strings.Contains(err.Error(), "Error 1049") || strings.Contains(err.Error(), "Unknown database")
}
