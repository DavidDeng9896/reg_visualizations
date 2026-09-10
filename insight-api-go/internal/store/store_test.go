package store_test

import (
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/storetest"
)

func TestPutAnalysisPersistsSnapshot(t *testing.T) {
	st := storetest.Open(t)

	saved, err := st.PutAnalysis(store.AnalysisDoc{
		"id":        "a1",
		"name":      "Test",
		"createdAt": "2026-01-01T00:00:00.000Z",
		"updatedAt": "2026-01-01T00:00:00.000Z",
		"revision":  1,
		"tables": []any{
			map[string]any{
				"id":      "t1",
				"name":    "src",
				"columns": []any{map[string]any{"field": "v", "title": "v", "dataType": "number"}},
				"rows":    []any{map[string]any{"v": 1.0}, map[string]any{"v": 2.0}},
				"stepId":  "s1",
			},
		},
		"steps":           []any{},
		"files":           []any{},
		"flowchartLayout": map[string]any{},
	}, "")
	if err != nil {
		t.Fatal(err)
	}
	if saved["revision"].(int64) != 1 {
		t.Fatalf("revision=%v", saved["revision"])
	}

	got, ok, err := st.GetAnalysis("a1")
	if err != nil || !ok {
		t.Fatalf("get: ok=%v err=%v", ok, err)
	}
	tables := got["tables"].([]any)
	rows := tables[0].(map[string]any)["rows"].([]any)
	if len(rows) != 2 {
		t.Fatalf("rows=%d", len(rows))
	}

	snap, err := st.GetLatestSnapshot("a1", "t1")
	if err != nil || snap == nil {
		t.Fatalf("snap: %v %v", snap, err)
	}
	if snap.DataVersion != "r1" || snap.RowCount != 2 {
		t.Fatalf("snap=%+v", snap)
	}
}

func TestOpenUsesExplicitDSN(t *testing.T) {
	base := store.ConfigFromEnv()
	dsn := base.FormatDSN()
	st, err := store.Open(store.Config{DSN: dsn, Host: "no-such-host", Port: 1})
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	if err := st.DB.Ping(); err != nil {
		t.Fatal(err)
	}
}

// Old MariaDB installs may have ai_conversations without step_id.
// migrate must not CREATE INDEX on step_id before ensureAiConversationStepID adds the column.
func TestMigrateOldAiConversationsWithoutStepID(t *testing.T) {
	st := storetest.Open(t)

	var dbName string
	if err := st.DB.QueryRow("SELECT DATABASE()").Scan(&dbName); err != nil {
		t.Fatal(err)
	}

	if _, err := st.DB.Exec(`DROP TABLE IF EXISTS ai_conversations`); err != nil {
		t.Fatal(err)
	}
	_, err := st.DB.Exec(`
		CREATE TABLE ai_conversations (
		  id            VARCHAR(64) NOT NULL,
		  analysis_id   VARCHAR(64) NULL,
		  title         VARCHAR(512) NOT NULL DEFAULT '',
		  created_at    VARCHAR(32) NOT NULL,
		  updated_at    VARCHAR(32) NOT NULL,
		  messages      JSON NOT NULL,
		  user_id       VARCHAR(64) NOT NULL DEFAULT 'david',
		  PRIMARY KEY (id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
	if err != nil {
		t.Fatal(err)
	}

	cfg := store.ConfigFromEnv()
	cfg.DSN = ""
	cfg.Database = dbName
	st2, err := store.Open(cfg)
	if err != nil {
		t.Fatalf("migrate old ai_conversations without step_id: %v", err)
	}
	defer st2.Close()

	var colCount int
	if err := st2.DB.QueryRow(`
		SELECT COUNT(*) FROM information_schema.COLUMNS
		 WHERE TABLE_SCHEMA = DATABASE()
		   AND TABLE_NAME = 'ai_conversations'
		   AND COLUMN_NAME = 'step_id'`).Scan(&colCount); err != nil {
		t.Fatal(err)
	}
	if colCount != 1 {
		t.Fatalf("step_id column count=%d want 1", colCount)
	}

	var idxCount int
	if err := st2.DB.QueryRow(`
		SELECT COUNT(*) FROM information_schema.STATISTICS
		 WHERE TABLE_SCHEMA = DATABASE()
		   AND TABLE_NAME = 'ai_conversations'
		   AND INDEX_NAME = 'ai_conv_step'`).Scan(&idxCount); err != nil {
		t.Fatal(err)
	}
	if idxCount < 1 {
		t.Fatalf("ai_conv_step index missing")
	}
}
