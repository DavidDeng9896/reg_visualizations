package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultPythonWorkerURL = "http://127.0.0.1:8091"
const defaultPythonExecuteTimeoutSec = 300

func pythonWorkerURL() string {
	if v := strings.TrimSpace(os.Getenv("PYTHON_WORKER_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return defaultPythonWorkerURL
}

func pythonWorkerUnreachableMessage(err error) string {
	base := pythonWorkerURL()
	detail := ""
	if err != nil {
		detail = err.Error()
	}
	return "python worker unreachable: " + detail +
		". Start worker: cd python-worker && python -m uvicorn app.main:app --host 127.0.0.1 --port 8091" +
		" (or start.cmd on Windows). Expected " + base + "/execute; set PYTHON_WORKER_URL if different."
}

func pythonExecuteTimeoutSec(body []byte) int {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return defaultPythonExecuteTimeoutSec
	}
	limits, ok := payload["limits"].(map[string]any)
	if !ok {
		return defaultPythonExecuteTimeoutSec
	}
	if n, ok := asFiniteInt(limits["timeoutSec"]); ok && n > 0 {
		return n
	}
	return defaultPythonExecuteTimeoutSec
}

func (s *Server) postPythonExecute(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 64<<20))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if len(body) == 0 {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if !json.Valid(body) {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}

	timeoutSec := pythonExecuteTimeoutSec(body)
	url := pythonWorkerURL() + "/execute"

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"ok": false,
			"error": map[string]any{
				"message": pythonWorkerUnreachableMessage(err),
			},
		})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: time.Duration(timeoutSec) * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"ok": false,
			"error": map[string]any{
				"message": pythonWorkerUnreachableMessage(err),
			},
		})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"ok": false,
			"error": map[string]any{
				"message": pythonWorkerUnreachableMessage(err),
			},
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(respBody)
}
