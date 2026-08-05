package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userid"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userscope"
)

func TestConversationsIsolatedByUser(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, "")
	h := srv.Handler()

	create := func(user, title string) string {
		req := httptest.NewRequest(http.MethodPost, "/api/ai/conversations", bytes.NewBufferString(`{"title":"`+title+`"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set(userid.HeaderName, user)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			t.Fatalf("create %s: %d %s", user, rr.Code, rr.Body.String())
		}
		var doc map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &doc)
		return doc["id"].(string)
	}

	idDavid := create("david", "david-chat")
	_ = create("dengxiaowei", "dx-chat")

	list := func(user string) []map[string]any {
		req := httptest.NewRequest(http.MethodGet, "/api/ai/conversations", nil)
		req.Header.Set(userid.HeaderName, user)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("list %s: %d", user, rr.Code)
		}
		var out []map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &out)
		return out
	}

	davidList := list("david")
	dxList := list("dengxiaowei")
	if len(davidList) != 1 || davidList[0]["title"] != "david-chat" {
		t.Fatalf("david list=%v", davidList)
	}
	if len(dxList) != 1 || dxList[0]["title"] != "dx-chat" {
		t.Fatalf("dx list=%v", dxList)
	}

	// Cross-user get → 404
	req := httptest.NewRequest(http.MethodGet, "/api/ai/conversations/"+idDavid, nil)
	req.Header.Set(userid.HeaderName, "dengxiaowei")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("cross-user get want 404 got %d", rr.Code)
	}
}

func TestSkillsIsolatedByUser(t *testing.T) {
	dir := t.TempDir()
	seed := filepath.Join(dir, "seed", "chart-best-practices")
	_ = os.MkdirAll(seed, 0o755)
	_ = os.WriteFile(filepath.Join(seed, "skill.json"), []byte(`{"id":"chart-best-practices","name":"Charts","version":"1.0.0","description":"c"}`), 0o644)
	_ = os.WriteFile(filepath.Join(seed, "SKILL.md"), []byte("# c"), 0o644)
	if err := userscope.MigrateOnce(dir, filepath.Join(dir, "seed")); err != nil {
		t.Fatal(err)
	}

	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, filepath.Join(dir, "seed"))
	h := srv.Handler()

	// Disable skill for david only
	req := httptest.NewRequest(http.MethodPatch, "/api/ai/skills/chart-best-practices", bytes.NewBufferString(`{"enabled":false}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(userid.HeaderName, "david")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("patch: %d %s", rr.Code, rr.Body.String())
	}

	enabled := func(user string) bool {
		req := httptest.NewRequest(http.MethodGet, "/api/ai/skills", nil)
		req.Header.Set(userid.HeaderName, user)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		var list []skills.Info
		_ = json.Unmarshal(rr.Body.Bytes(), &list)
		for _, s := range list {
			if s.ID == "chart-best-practices" {
				return s.Enabled
			}
		}
		t.Fatalf("skill missing for %s", user)
		return true
	}
	if enabled("david") {
		t.Fatal("david should have skill disabled")
	}
	if !enabled("dengxiaowei") {
		t.Fatal("dengxiaowei should still have skill enabled")
	}
}

func TestMcpIsolatedByUser(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	_ = userscope.MigrateOnce(dir, "")
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, "")
	h := srv.Handler()

	body := `{"name":"svc","url":"http://example.invalid/mcp","headers":[]}`
	req := httptest.NewRequest(http.MethodPost, "/api/ai/mcp/servers", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(userid.HeaderName, "david")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rr.Code, rr.Body.String())
	}

	list := func(user string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/ai/mcp/servers", nil)
		req.Header.Set(userid.HeaderName, user)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		var out []any
		_ = json.Unmarshal(rr.Body.Bytes(), &out)
		return len(out)
	}
	if list("david") != 1 {
		t.Fatal("david should see 1 mcp")
	}
	if list("dengxiaowei") != 0 {
		t.Fatal("dengxiaowei should see 0 mcp")
	}
}
