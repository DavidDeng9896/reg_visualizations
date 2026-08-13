package migrate

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	_ "modernc.org/sqlite"
)

type Stats struct {
	Analyses      int
	Dashboards    int
	Snapshots     int
	Outbox        int
	Conversations int
}

func FromSQLite(sqlitePath string, dest *store.Store) (Stats, error) {
	var stats Stats
	if sqlitePath == "" {
		sqlitePath = os.Getenv("INSIGHT_DB_PATH")
	}
	if sqlitePath == "" {
		sqlitePath = "data/insight.sqlite"
	}
	src, err := sql.Open("sqlite", sqlitePath)
	if err != nil {
		return stats, err
	}
	defer src.Close()
	if err := src.Ping(); err != nil {
		return stats, fmt.Errorf("open sqlite %s: %w", sqlitePath, err)
	}

	n, err := copyTable(src, dest.DB, `SELECT id, workspace_id, name, revision, document, created_at, updated_at, deleted_at FROM analyses`,
		`INSERT INTO analyses (id, workspace_id, name, revision, document, created_at, updated_at, deleted_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   workspace_id = VALUES(workspace_id),
		   name = VALUES(name),
		   revision = VALUES(revision),
		   document = VALUES(document),
		   created_at = VALUES(created_at),
		   updated_at = VALUES(updated_at),
		   deleted_at = VALUES(deleted_at)`, 8)
	if err != nil {
		return stats, fmt.Errorf("analyses: %w", err)
	}
	stats.Analyses = n

	n, err = copyTable(src, dest.DB, `SELECT id, workspace_id, name, revision, document, created_at, updated_at FROM dashboards`,
		`INSERT INTO dashboards (id, workspace_id, name, revision, document, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   workspace_id = VALUES(workspace_id),
		   name = VALUES(name),
		   revision = VALUES(revision),
		   document = VALUES(document),
		   created_at = VALUES(created_at),
		   updated_at = VALUES(updated_at)`, 7)
	if err != nil {
		return stats, fmt.Errorf("dashboards: %w", err)
	}
	stats.Dashboards = n

	n, err = copyTable(src, dest.DB, `SELECT id, analysis_id, table_id, step_id, data_version, columns, rows, row_count, created_at FROM table_snapshots`,
		`INSERT INTO table_snapshots (id, analysis_id, table_id, step_id, data_version, columns, row_data, row_count, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   columns = VALUES(columns),
		   row_data = VALUES(row_data),
		   row_count = VALUES(row_count),
		   step_id = VALUES(step_id),
		   created_at = VALUES(created_at)`, 9)
	if err != nil {
		return stats, fmt.Errorf("table_snapshots: %w", err)
	}
	stats.Snapshots = n

	n, err = copyTable(src, dest.DB, `SELECT id, workspace_id, event_type, payload, created_at, published_at FROM event_outbox`,
		`INSERT INTO event_outbox (id, workspace_id, event_type, payload, created_at, published_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   workspace_id = VALUES(workspace_id),
		   event_type = VALUES(event_type),
		   payload = VALUES(payload),
		   created_at = VALUES(created_at),
		   published_at = VALUES(published_at)`, 6)
	if err != nil {
		return stats, fmt.Errorf("event_outbox: %w", err)
	}
	stats.Outbox = n

	n, err = copyConversations(src, dest.DB)
	if err != nil {
		return stats, fmt.Errorf("ai_conversations: %w", err)
	}
	stats.Conversations = n
	return stats, nil
}

func copyConversations(src, dest *sql.DB) (int, error) {
	cols, err := tableColumns(src, "ai_conversations")
	if err != nil {
		return 0, err
	}
	hasUser := false
	for _, c := range cols {
		if c == "user_id" {
			hasUser = true
			break
		}
	}
	sel := `SELECT id, analysis_id, title, created_at, updated_at, messages FROM ai_conversations`
	if hasUser {
		sel = `SELECT id, analysis_id, title, created_at, updated_at, messages, user_id FROM ai_conversations`
	}
	rows, err := src.Query(sel)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		var id, title, createdAt, updatedAt, messages string
		var analysisID, userID sql.NullString
		if hasUser {
			if err := rows.Scan(&id, &analysisID, &title, &createdAt, &updatedAt, &messages, &userID); err != nil {
				return n, err
			}
		} else {
			if err := rows.Scan(&id, &analysisID, &title, &createdAt, &updatedAt, &messages); err != nil {
				return n, err
			}
			userID = sql.NullString{String: "david", Valid: true}
		}
		uid := "david"
		if userID.Valid && userID.String != "" {
			uid = userID.String
		}
		var aid any
		if analysisID.Valid {
			aid = analysisID.String
		}
		if messages == "" {
			messages = "[]"
		}
		_, err := dest.Exec(
			`INSERT INTO ai_conversations (id, analysis_id, title, created_at, updated_at, messages, user_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE
			   analysis_id = VALUES(analysis_id),
			   title = VALUES(title),
			   created_at = VALUES(created_at),
			   updated_at = VALUES(updated_at),
			   messages = VALUES(messages),
			   user_id = VALUES(user_id)`,
			id, aid, title, createdAt, updatedAt, messages, uid,
		)
		if err != nil {
			return n, err
		}
		n++
	}
	return n, rows.Err()
}

func tableColumns(db *sql.DB, table string) ([]string, error) {
	rows, err := db.Query(`SELECT name FROM pragma_table_info(?)`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cols []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		cols = append(cols, name)
	}
	return cols, rows.Err()
}

func copyTable(src, dest *sql.DB, selectSQL, insertSQL string, nCols int) (int, error) {
	rows, err := src.Query(selectSQL)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		vals := make([]any, nCols)
		ptrs := make([]any, nCols)
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return n, err
		}
		if _, err := dest.Exec(insertSQL, vals...); err != nil {
			return n, err
		}
		n++
	}
	return n, rows.Err()
}
