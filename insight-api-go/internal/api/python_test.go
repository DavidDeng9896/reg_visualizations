package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
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
	if msg == "" || len(msg) < len("python worker unreachable: ") {
		t.Fatalf("message=%q", msg)
	}
}
