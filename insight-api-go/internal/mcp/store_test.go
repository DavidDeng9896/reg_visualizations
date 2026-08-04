package mcp_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
)

func TestStoreCRUDAndMask(t *testing.T) {
	dir := t.TempDir()
	st, err := mcp.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	v, err := st.Create("demo", "http://example.com/mcp", []mcp.HeaderKV{{Key: "Authorization", Value: "Bearer secret-token"}})
	if err != nil {
		t.Fatal(err)
	}
	if !v.HeadersConfigured || len(v.HeaderKeys) != 1 || v.HeaderKeys[0] != "Authorization" {
		t.Fatalf("public view=%+v", v)
	}
	// ensure file has secret but List does not expose value
	rawList, _ := st.List()
	b, _ := json.Marshal(rawList)
	if string(b) == "" || contains(string(b), "secret-token") {
		t.Fatalf("list leaked secret: %s", b)
	}

	en := false
	v2, err := st.Patch(v.ID, nil, nil, nil, &en)
	if err != nil || v2.Enabled {
		t.Fatalf("patch=%v err=%v", v2, err)
	}
	if err := st.Delete(v.ID); err != nil {
		t.Fatal(err)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || (len(s) > 0 && (stringIndex(s, sub) >= 0)))
}
func stringIndex(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func TestClientListAndCall(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		_ = json.NewDecoder(r.Body).Decode(&req)
		method, _ := req["method"].(string)
		w.Header().Set("Content-Type", "application/json")
		switch method {
		case "initialize":
			_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": 1, "result": map[string]any{"protocolVersion": "2024-11-05"}})
		case "notifications/initialized":
			_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": 1, "result": map[string]any{}})
		case "tools/list":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0", "id": 1,
				"result": map[string]any{"tools": []any{map[string]any{"name": "echo", "description": "echo", "inputSchema": map[string]any{"type": "object"}}}},
			})
		case "tools/call":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0", "id": 1,
				"result": map[string]any{"content": []any{map[string]any{"type": "text", "text": "ok"}}},
			})
		default:
			http.Error(w, "unknown", 400)
		}
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	dir := t.TempDir()
	st, _ := mcp.NewStore(dir)
	st.Client.HTTP = srv.Client()
	v, err := st.Create("mock", srv.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	pv, err := st.Refresh(v.ID)
	if err != nil {
		t.Fatal(err)
	}
	if pv.ToolCount != 1 {
		t.Fatalf("tools=%d", pv.ToolCount)
	}
	out, err := st.Call(v.ID, "echo", map[string]any{"x": 1})
	if err != nil || out == nil {
		t.Fatalf("call=%v err=%v", out, err)
	}
}
