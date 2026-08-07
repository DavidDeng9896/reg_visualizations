package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userid"
)

func multipartBody(t *testing.T, field, filename string, content []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile(field, filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return &buf, w.FormDataContentType()
}

func TestAiFilesUploadDownloadMetaDelete(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, "")
	h := srv.Handler()

	body, ctype := multipartBody(t, "file", "sample.csv", []byte("x,y\n1,2\n"))
	req := httptest.NewRequest(http.MethodPost, "/api/ai/files", body)
	req.Header.Set("Content-Type", ctype)
	req.Header.Set(userid.HeaderName, "david")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("upload: %d %s", rr.Code, rr.Body.String())
	}
	var meta map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &meta); err != nil {
		t.Fatal(err)
	}
	id, _ := meta["id"].(string)
	if id == "" || meta["kind"] != "csv" || meta["name"] != "sample.csv" {
		t.Fatalf("meta=%v", meta)
	}

	// meta endpoint
	req = httptest.NewRequest(http.MethodGet, "/api/ai/files/"+id+"/meta", nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("meta: %d %s", rr.Code, rr.Body.String())
	}

	// download
	req = httptest.NewRequest(http.MethodGet, "/api/ai/files/"+id, nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("download: %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "text/csv" {
		t.Fatalf("content-type=%q", ct)
	}
	if cd := rr.Header().Get("Content-Disposition"); cd == "" || !bytes.Contains([]byte(cd), []byte("sample.csv")) {
		t.Fatalf("content-disposition=%q", cd)
	}
	if rr.Body.String() != "x,y\n1,2\n" {
		t.Fatalf("body=%q", rr.Body.String())
	}

	// list
	req = httptest.NewRequest(http.MethodGet, "/api/ai/files", nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("list: %d", rr.Code)
	}
	var list []map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &list)
	if len(list) != 1 || list[0]["id"] != id {
		t.Fatalf("list=%v", list)
	}

	// delete
	req = httptest.NewRequest(http.MethodDelete, "/api/ai/files/"+id, nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rr.Code)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/ai/files/"+id+"/meta", nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("after delete want 404 got %d", rr.Code)
	}
}

func TestAiFilesIsolatedByUser(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, "")
	h := srv.Handler()

	upload := func(user, name string) string {
		body, ctype := multipartBody(t, "file", name, []byte("hello"))
		req := httptest.NewRequest(http.MethodPost, "/api/ai/files", body)
		req.Header.Set("Content-Type", ctype)
		req.Header.Set(userid.HeaderName, user)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			t.Fatalf("upload %s: %d %s", user, rr.Code, rr.Body.String())
		}
		var meta map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &meta)
		return meta["id"].(string)
	}

	idDavid := upload("david", "a.txt")
	_ = upload("dengxiaowei", "b.txt")

	req := httptest.NewRequest(http.MethodGet, "/api/ai/files/"+idDavid+"/meta", nil)
	req.Header.Set(userid.HeaderName, "dengxiaowei")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("cross-user meta want 404 got %d", rr.Code)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/ai/files", nil)
	req.Header.Set(userid.HeaderName, "david")
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	raw, _ := io.ReadAll(rr.Body)
	var list []map[string]any
	_ = json.Unmarshal(raw, &list)
	if len(list) != 1 || list[0]["name"] != "a.txt" {
		t.Fatalf("david list=%v", list)
	}
}

func TestAiFilesRejectBadType(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	srv := api.NewWithUserData(st, filepath.Join(dir, "ai-config.json"), dir, "")
	h := srv.Handler()

	body, ctype := multipartBody(t, "file", "evil.exe", []byte("MZ"))
	req := httptest.NewRequest(http.MethodPost, "/api/ai/files", body)
	req.Header.Set("Content-Type", ctype)
	req.Header.Set(userid.HeaderName, "david")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d %s", rr.Code, rr.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	if out["error"] != "invalid_file_type" {
		t.Fatalf("out=%v", out)
	}
}
