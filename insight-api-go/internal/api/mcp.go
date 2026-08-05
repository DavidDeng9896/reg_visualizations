package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
)

func (s *Server) listMcpServers(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	list, err := st.List()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) createMcpServer(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusInternalServerError, "mcp_unavailable")
		return
	}
	var body struct {
		Name    string         `json:"name"`
		URL     string         `json:"url"`
		Headers []mcp.HeaderKV `json:"headers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	v, err := st.Create(body.Name, body.URL, body.Headers)
	if errors.Is(err, mcp.ErrBadInput) {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

func (s *Server) patchMcpServer(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Name    *string         `json:"name"`
		URL     *string         `json:"url"`
		Headers *[]mcp.HeaderKV `json:"headers"`
		Enabled *bool           `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	v, err := st.Patch(r.PathValue("id"), body.Name, body.URL, body.Headers, body.Enabled)
	if errors.Is(err, mcp.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) deleteMcpServer(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err = st.Delete(r.PathValue("id"))
	if errors.Is(err, mcp.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) refreshMcpServer(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	v, err := st.Refresh(r.PathValue("id"))
	if errors.Is(err, mcp.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "refresh_failed", "message": err.Error(), "server": v})
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) listMcpTools(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	tools, err := st.EnabledTools()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, tools)
}

func (s *Server) callMcpTool(w http.ResponseWriter, r *http.Request) {
	st, err := s.mcpFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusInternalServerError, "mcp_unavailable")
		return
	}
	var body struct {
		ServerID  string         `json:"serverId"`
		Name      string         `json:"name"`
		Arguments map[string]any `json:"arguments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ServerID == "" || body.Name == "" {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	res, err := st.Call(body.ServerID, body.Name, body.Arguments)
	if errors.Is(err, mcp.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "call_failed", "message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "result": res})
}
