package migrate_test

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/migrate"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/storetest"
	_ "modernc.org/sqlite"
)

func TestFromSQLiteCopiesAnalysisAndConversation(t *testing.T) {
	dir := t.TempDir()
	sqlitePath := filepath.Join(dir, "insight.sqlite")
	src, err := sql.Open("sqlite", sqlitePath)
	if err != nil {
		t.Fatal(err)
	}
	_, err = src.Exec(`
      CREATE TABLE analyses (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE dashboards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE table_snapshots (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        step_id TEXT,
        data_version TEXT NOT NULL,
        columns TEXT NOT NULL,
        rows TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE event_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        published_at TEXT
      );
      CREATE TABLE ai_conversations (
        id TEXT PRIMARY KEY,
        analysis_id TEXT,
        title TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]',
        user_id TEXT NOT NULL DEFAULT 'david'
      );
    `)
	if err != nil {
		t.Fatal(err)
	}
	_, err = src.Exec(`
      INSERT INTO analyses (id, workspace_id, name, revision, document, created_at, updated_at, deleted_at)
      VALUES ('a1', '00000000-0000-0000-0000-000000000001', 'Demo', 2,
              '{"id":"a1","name":"Demo","revision":2}',
              '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', NULL);
      INSERT INTO ai_conversations (id, analysis_id, title, created_at, updated_at, messages, user_id)
      VALUES ('c1', 'a1', 'hello', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '[]', 'david');
    `)
	if err != nil {
		t.Fatal(err)
	}
	_ = src.Close()

	dest := storetest.Open(t)
	stats, err := migrate.FromSQLite(sqlitePath, dest)
	if err != nil {
		t.Fatal(err)
	}
	if stats.Analyses != 1 || stats.Conversations != 1 {
		t.Fatalf("stats=%+v", stats)
	}
	got, ok, err := dest.GetAnalysis("a1")
	if err != nil || !ok {
		t.Fatalf("get: ok=%v err=%v", ok, err)
	}
	if got["name"] != "Demo" {
		t.Fatalf("doc=%v", got)
	}

	stats2, err := migrate.FromSQLite(sqlitePath, dest)
	if err != nil {
		t.Fatal(err)
	}
	if stats2.Analyses != 1 {
		t.Fatalf("idempotent stats=%+v", stats2)
	}
}
