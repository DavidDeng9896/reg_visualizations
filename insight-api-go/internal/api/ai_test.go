package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/storetest"
)

func newTestServer(t *testing.T) *api.Server {
	t.Helper()
	dir := t.TempDir()
	st := storetest.Open(t)
	return api.NewWithConfigPath(st, filepath.Join(dir, "ai-config.json"))
}

func TestAiConfigGetPut(t *testing.T) {
	srv := newTestServer(t)
	h := srv.Handler()

	// GET default
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/config", nil))
	if rr.Code != 200 {
		t.Fatalf("GET status=%d body=%s", rr.Code, rr.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["configured"] != false {
		t.Fatalf("configured=%v", got["configured"])
	}
	if got["model"] == nil || got["model"] == "" {
		t.Fatalf("missing model: %v", got)
	}

	// PUT save
	body := map[string]any{
		"baseUrl":            "https://example.com/v1",
		"apiKey":             "sk-test-key-12345678",
		"model":              "demo-model",
		"models":             []string{"demo-model", "other"},
		"maxIterations":      12,
		"confirmDestructive": false,
		"confirmWrite":       true,
	}
	raw, _ := json.Marshal(body)
	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/ai/config", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("PUT status=%d body=%s", rr.Code, rr.Body.String())
	}
	var putRes map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &putRes)
	if putRes["ok"] != true || putRes["configured"] != true {
		t.Fatalf("putRes=%v", putRes)
	}

	// GET reflects save (key masked, not raw)
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/config", nil))
	_ = json.Unmarshal(rr.Body.Bytes(), &got)
	if got["configured"] != true || got["model"] != "demo-model" {
		t.Fatalf("after save: %v", got)
	}
	masked, _ := got["apiKeyMasked"].(string)
	if masked == "" || masked == "sk-test-key-12345678" {
		t.Fatalf("apiKey should be masked, got %q", masked)
	}
	if got["baseUrl"] != "https://example.com/v1" {
		t.Fatalf("baseUrl=%v", got["baseUrl"])
	}

	// PUT without apiKey keeps previous key
	raw, _ = json.Marshal(map[string]any{"model": "demo-model-2"})
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/api/ai/config", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("PUT keep key status=%d", rr.Code)
	}
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/config", nil))
	_ = json.Unmarshal(rr.Body.Bytes(), &got)
	if got["model"] != "demo-model-2" || got["configured"] != true {
		t.Fatalf("keep key: %v", got)
	}
}

func TestAiConversationsCRUD(t *testing.T) {
	srv := newTestServer(t)
	h := srv.Handler()

	raw, _ := json.Marshal(map[string]any{
		"analysisId": "a1",
		"title":      "hello",
		"messages":   []any{map[string]any{"role": "user", "content": "hi"}},
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/conversations", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)
	if rr.Code != 201 {
		t.Fatalf("POST status=%d body=%s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("no id: %v", created)
	}

	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/conversations/"+id, nil))
	if rr.Code != 200 {
		t.Fatalf("GET one status=%d", rr.Code)
	}
	var doc map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &doc)
	if doc["title"] != "hello" {
		t.Fatalf("doc=%v", doc)
	}

	raw, _ = json.Marshal(map[string]any{"title": "renamed"})
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/api/ai/conversations/"+id, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("PUT status=%d body=%s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/conversations", nil))
	if rr.Code != 200 {
		t.Fatalf("LIST status=%d", rr.Code)
	}
	body, _ := io.ReadAll(rr.Body)
	if !bytes.Contains(body, []byte("renamed")) {
		t.Fatalf("list missing renamed: %s", body)
	}

	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodDelete, "/api/ai/conversations/"+id, nil))
	if rr.Code != 204 {
		t.Fatalf("DELETE status=%d", rr.Code)
	}
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/conversations/"+id, nil))
	if rr.Code != 404 {
		t.Fatalf("GET deleted status=%d", rr.Code)
	}
}

func TestAiConversationsScopedByStep(t *testing.T) {
	srv := newTestServer(t)
	h := srv.Handler()

	post := func(body map[string]any) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(body)
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/ai/conversations", bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		h.ServeHTTP(rr, req)
		if rr.Code != 201 {
			t.Fatalf("POST status=%d body=%s", rr.Code, rr.Body.String())
		}
		var doc map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &doc)
		return doc
	}

	global := post(map[string]any{
		"analysisId": "analysis-other",
		"title":      "其他分析主会话",
		"messages":   []any{map[string]any{"role": "user", "content": "global hello"}},
	})
	stepA := post(map[string]any{
		"analysisId": "analysis-a",
		"stepId":     "step-a",
		"title":      "Custom Code AI",
		"messages":   []any{map[string]any{"role": "user", "content": "node a"}},
	})
	_ = post(map[string]any{
		"analysisId": "analysis-b",
		"stepId":     "step-b",
		"title":      "Custom Code AI",
		"messages":   []any{map[string]any{"role": "user", "content": "node b"}},
	})

	if stepA["stepId"] != "step-a" {
		t.Fatalf("create should persist stepId, got %v", stepA["stepId"])
	}

	list := func(qs string) []map[string]any {
		t.Helper()
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/ai/conversations"+qs, nil))
		if rr.Code != 200 {
			t.Fatalf("LIST %s status=%d body=%s", qs, rr.Code, rr.Body.String())
		}
		var out []map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &out)
		return out
	}

	ids := func(rows []map[string]any) []string {
		var out []string
		for _, r := range rows {
			id, _ := r["id"].(string)
			out = append(out, id)
		}
		return out
	}

	globalList := list("")
	gids := ids(globalList)
	if !containsStr(gids, global["id"].(string)) {
		t.Fatalf("global list missing main conversation: %v", gids)
	}
	if containsStr(gids, stepA["id"].(string)) {
		t.Fatalf("global list must not include Custom Code conversations: %v", gids)
	}

	stepList := list("?stepId=step-a")
	if len(stepList) != 1 || stepList[0]["id"] != stepA["id"] {
		t.Fatalf("step-a list=%v want only %v", stepList, stepA["id"])
	}
	if stepList[0]["stepId"] != "step-a" {
		t.Fatalf("step list item stepId=%v", stepList[0]["stepId"])
	}

	empty := list("?stepId=step-missing")
	if len(empty) != 0 {
		t.Fatalf("unknown step should be empty, got %v", empty)
	}
}

func containsStr(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
