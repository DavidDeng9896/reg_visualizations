// Package store persists Insight documents + table data content.
// Product rule: store parsed columns/rows only; never store imported raw files.
package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

const DefaultWorkspace = "00000000-0000-0000-0000-000000000001"

// AnalysisDoc is the full analysis JSON document returned to the frontend.
type AnalysisDoc map[string]any

// DashboardDoc is the full dashboard JSON document.
type DashboardDoc map[string]any

// Snapshot is the latest data-content snapshot for a table.
type Snapshot struct {
	ID          string          `json:"id"`
	AnalysisID  string          `json:"analysisId"`
	TableID     string          `json:"tableId"`
	DataVersion string          `json:"dataVersion"`
	Columns     json.RawMessage `json:"columns"`
	Rows        json.RawMessage `json:"rows"`
	RowCount    int             `json:"rowCount"`
	CreatedAt   string          `json:"createdAt"`
}

type Store struct {
	DB *sql.DB
}

func Open(dbPath string) (*Store, error) {
	if dbPath == "" {
		dbPath = os.Getenv("INSIGHT_DB_PATH")
	}
	if dbPath == "" {
		dbPath = filepath.Join("data", "insight.sqlite")
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	// SQLite: single writer; raise busy timeout for concurrent reads.
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;`); err != nil {
		_ = db.Close()
		return nil, err
	}
	s := &Store{DB: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	return s.DB.Close()
}

func (s *Store) migrate() error {
	_, err := s.DB.Exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT '` + DefaultWorkspace + `',
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS analyses_workspace_updated
        ON analyses (workspace_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS dashboards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT '` + DefaultWorkspace + `',
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS dashboards_workspace_updated
        ON dashboards (workspace_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS table_snapshots (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        table_id TEXT NOT NULL,
        step_id TEXT,
        data_version TEXT NOT NULL,
        columns TEXT NOT NULL,
        rows TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (analysis_id, table_id, data_version)
      );
      CREATE INDEX IF NOT EXISTS table_snapshots_latest
        ON table_snapshots (analysis_id, table_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS event_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL DEFAULT '` + DefaultWorkspace + `',
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        published_at TEXT
      );

      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        analysis_id TEXT,
        title TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]',
        user_id TEXT NOT NULL DEFAULT 'david'
      );
      CREATE INDEX IF NOT EXISTS ai_conv_updated ON ai_conversations(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_conv_user_updated ON ai_conversations(user_id, updated_at DESC);
    `)
	if err != nil {
		return err
	}
	// Existing DBs created before user_id: add column (ignore duplicate-column error).
	_, _ = s.DB.Exec(`ALTER TABLE ai_conversations ADD COLUMN user_id TEXT NOT NULL DEFAULT 'david'`)
	_, _ = s.DB.Exec(`UPDATE ai_conversations SET user_id = 'david' WHERE user_id IS NULL OR user_id = ''`)
	_, _ = s.DB.Exec(`CREATE INDEX IF NOT EXISTS idx_ai_conv_user_updated ON ai_conversations(user_id, updated_at DESC)`)
	return nil
}

func nowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

func (s *Store) ListAnalyses(workspaceID string) ([]AnalysisDoc, error) {
	if workspaceID == "" {
		workspaceID = DefaultWorkspace
	}
	rows, err := s.DB.Query(
		`SELECT document FROM analyses
		 WHERE workspace_id = ? AND deleted_at IS NULL
		 ORDER BY updated_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AnalysisDoc, 0)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var doc AnalysisDoc
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			return nil, err
		}
		out = append(out, doc)
	}
	return out, rows.Err()
}

func (s *Store) GetAnalysis(id string) (AnalysisDoc, bool, error) {
	var raw string
	err := s.DB.QueryRow(
		`SELECT document FROM analyses WHERE id = ? AND deleted_at IS NULL`, id,
	).Scan(&raw)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	var doc AnalysisDoc
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		return nil, false, err
	}
	return doc, true, nil
}

func asString(v any, fallback string) string {
	if s, ok := v.(string); ok && s != "" {
		return s
	}
	return fallback
}

func asInt64(v any, fallback int64) int64 {
	switch n := v.(type) {
	case float64:
		return int64(n)
	case int64:
		return n
	case int:
		return int64(n)
	case json.Number:
		i, err := n.Int64()
		if err == nil {
			return i
		}
	}
	return fallback
}

func (s *Store) PutAnalysis(analysis AnalysisDoc, workspaceID string) (AnalysisDoc, error) {
	if workspaceID == "" {
		workspaceID = DefaultWorkspace
	}
	now := nowISO()
	id := asString(analysis["id"], "")
	if id == "" {
		return nil, fmt.Errorf("missing id")
	}
	revision := asInt64(analysis["revision"], 0)
	doc := AnalysisDoc{}
	for k, v := range analysis {
		doc[k] = v
	}
	doc["revision"] = revision
	doc["updatedAt"] = asString(doc["updatedAt"], now)
	doc["createdAt"] = asString(doc["createdAt"], now)
	if _, ok := doc["files"]; !ok {
		doc["files"] = []any{}
	}

	raw, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}

	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.Exec(
		`INSERT INTO analyses (id, workspace_id, name, revision, document, created_at, updated_at, deleted_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
		 ON CONFLICT(id) DO UPDATE SET
		   name = excluded.name,
		   revision = excluded.revision,
		   document = excluded.document,
		   updated_at = excluded.updated_at,
		   deleted_at = NULL`,
		id, workspaceID, asString(doc["name"], id), revision, string(raw),
		asString(doc["createdAt"], now), asString(doc["updatedAt"], now),
	)
	if err != nil {
		return nil, err
	}

	tables, _ := doc["tables"].([]any)
	dataVersion := fmt.Sprintf("r%d", revision)
	for _, t := range tables {
		table, ok := t.(map[string]any)
		if !ok {
			continue
		}
		tableID := asString(table["id"], "")
		if tableID == "" {
			continue
		}
		cols, err := json.Marshal(table["columns"])
		if err != nil {
			cols = []byte("[]")
		}
		if table["columns"] == nil {
			cols = []byte("[]")
		}
		rowBytes, err := json.Marshal(table["rows"])
		if err != nil || table["rows"] == nil {
			rowBytes = []byte("[]")
		}
		rowCount := 0
		if arr, ok := table["rows"].([]any); ok {
			rowCount = len(arr)
		}
		var stepID any
		if sid := asString(table["stepId"], ""); sid != "" {
			stepID = sid
		}
		_, err = tx.Exec(
			`INSERT INTO table_snapshots
			   (id, analysis_id, table_id, step_id, data_version, columns, rows, row_count, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(analysis_id, table_id, data_version) DO UPDATE SET
			   columns = excluded.columns,
			   rows = excluded.rows,
			   row_count = excluded.row_count,
			   step_id = excluded.step_id,
			   created_at = excluded.created_at`,
			uuid.NewString(), id, tableID, stepID, dataVersion,
			string(cols), string(rowBytes), rowCount, asString(doc["updatedAt"], now),
		)
		if err != nil {
			return nil, err
		}
	}

	payload, _ := json.Marshal(map[string]any{
		"id": id, "revision": revision, "reason": "put",
	})
	_, err = tx.Exec(
		`INSERT INTO event_outbox (workspace_id, event_type, payload, created_at)
		 VALUES (?, 'analysis.updated', ?, ?)`,
		workspaceID, string(payload), asString(doc["updatedAt"], now),
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *Store) DeleteAnalysis(id string) (bool, error) {
	res, err := s.DB.Exec(`DELETE FROM analyses WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *Store) ListDashboards(workspaceID string) ([]DashboardDoc, error) {
	if workspaceID == "" {
		workspaceID = DefaultWorkspace
	}
	rows, err := s.DB.Query(
		`SELECT document FROM dashboards WHERE workspace_id = ? ORDER BY updated_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]DashboardDoc, 0)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var doc DashboardDoc
		if err := json.Unmarshal([]byte(raw), &doc); err != nil {
			return nil, err
		}
		out = append(out, doc)
	}
	return out, rows.Err()
}

func (s *Store) GetDashboard(id string) (DashboardDoc, bool, error) {
	var raw string
	err := s.DB.QueryRow(`SELECT document FROM dashboards WHERE id = ?`, id).Scan(&raw)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	var doc DashboardDoc
	if err := json.Unmarshal([]byte(raw), &doc); err != nil {
		return nil, false, err
	}
	return doc, true, nil
}

func (s *Store) PutDashboard(dashboard DashboardDoc, workspaceID string) (DashboardDoc, error) {
	if workspaceID == "" {
		workspaceID = DefaultWorkspace
	}
	now := nowISO()
	id := asString(dashboard["id"], "")
	if id == "" {
		return nil, fmt.Errorf("missing id")
	}
	revision := asInt64(dashboard["revision"], 0)
	doc := DashboardDoc{}
	for k, v := range dashboard {
		doc[k] = v
	}
	doc["revision"] = revision
	doc["updatedAt"] = asString(doc["updatedAt"], now)
	doc["createdAt"] = asString(doc["createdAt"], now)
	raw, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}
	_, err = s.DB.Exec(
		`INSERT INTO dashboards (id, workspace_id, name, revision, document, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   name = excluded.name,
		   revision = excluded.revision,
		   document = excluded.document,
		   updated_at = excluded.updated_at`,
		id, workspaceID, asString(doc["name"], id), revision, string(raw),
		asString(doc["createdAt"], now), asString(doc["updatedAt"], now),
	)
	if err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *Store) DeleteDashboard(id string) (bool, error) {
	res, err := s.DB.Exec(`DELETE FROM dashboards WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *Store) GetLatestSnapshot(analysisID, tableID string) (*Snapshot, error) {
	var snap Snapshot
	var cols, rows string
	err := s.DB.QueryRow(
		`SELECT id, data_version, columns, rows, row_count, created_at
		 FROM table_snapshots
		 WHERE analysis_id = ? AND table_id = ?
		 ORDER BY created_at DESC LIMIT 1`,
		analysisID, tableID,
	).Scan(&snap.ID, &snap.DataVersion, &cols, &rows, &snap.RowCount, &snap.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	snap.AnalysisID = analysisID
	snap.TableID = tableID
	snap.Columns = json.RawMessage(cols)
	snap.Rows = json.RawMessage(rows)
	return &snap, nil
}
