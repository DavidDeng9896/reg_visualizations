package store_test

import (
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

func TestPutAnalysisPersistsSnapshot(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "t.sqlite")
	st, err := store.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()

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
