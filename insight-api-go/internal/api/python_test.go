package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPostPythonExecuteProxiesToWorker(t *testing.T) {
	var gotBody []byte
	worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/execute" {
			http.NotFound(w, r)
			return
		}
		var err error
		gotBody, err = io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true,"outputs":[],"stdout":"","stderr":"","error":null}`))
	}))
	t.Cleanup(worker.Close)

	t.Setenv("PYTHON_WORKER_URL", worker.URL)

	srv := newTestServer(t)
	h := srv.Handler()

	reqBody := map[string]any{
		"code":   "def custom_code(inputs): return inputs",
		"inputs": []any{},
		"limits": map[string]any{"timeoutSec": 30},
	}
	raw, _ := json.Marshal(reqBody)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/python/execute", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if !bytes.Equal(gotBody, raw) {
		t.Fatalf("worker body=%s want=%s", gotBody, raw)
	}
	var resp map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["ok"] != true {
		t.Fatalf("resp=%v", resp)
	}
}

func TestPostPythonExecuteWorkerUnreachable(t *testing.T) {
	t.Setenv("PYTHON_WORKER_URL", "http://127.0.0.1:1")

	srv := newTestServer(t)
	h := srv.Handler()

	raw := []byte(`{"code":"x","inputs":[],"limits":{"timeoutSec":1}}`)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/python/execute", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadGateway {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["ok"] != false {
		t.Fatalf("ok=%v", resp["ok"])
	}
	errObj, ok := resp["error"].(map[string]any)
	if !ok {
		t.Fatalf("error=%v", resp["error"])
	}
	msg, _ := errObj["message"].(string)
	if !strings.Contains(msg, "python worker unreachable:") {
		t.Fatalf("message=%q", msg)
	}
	if !strings.Contains(msg, "Start worker:") {
		t.Fatalf("expected start hint in message=%q", msg)
	}
}

func TestGetPythonHealthProxiesToWorker(t *testing.T) {
	worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/health" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"packages":{"rdkit":"2024.9.6"},"missing":[]}`))
	}))
	t.Cleanup(worker.Close)
	t.Setenv("PYTHON_WORKER_URL", worker.URL)

	srv := newTestServer(t)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/python/health", nil)
	srv.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"rdkit"`) {
		t.Fatalf("body=%s", rr.Body.String())
	}
}

func TestPostPythonInstallPackagesProxiesToWorker(t *testing.T) {
	var gotMethod, gotPath string
	worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"installed":true,"missing":[],"message":"白名单包已安装。"}`))
	}))
	t.Cleanup(worker.Close)
	t.Setenv("PYTHON_WORKER_URL", worker.URL)

	srv := newTestServer(t)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/python/install-packages", nil)
	srv.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if gotMethod != http.MethodPost || gotPath != "/install-packages" {
		t.Fatalf("worker %s %s", gotMethod, gotPath)
	}
	if !strings.Contains(rr.Body.String(), `"installed":true`) {
		t.Fatalf("body=%s", rr.Body.String())
	}
}
