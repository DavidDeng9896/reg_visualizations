package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
)

func (s *Server) listMcpServers(w http.ResponseWriter, _ *http.Request) {
	if s.MCP == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	list, err := s.MCP.List()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) createMcpServer(w http.ResponseWriter, r *http.Request) {
	if s.MCP == nil {
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
	v, err := s.MCP.Create(body.Name, body.URL, body.Headers)
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
	if s.MCP == nil {
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
	v, err := s.MCP.Patch(r.PathValue("id"), body.Name, body.URL, body.Headers, body.Enabled)
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
	if s.MCP == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err := s.MCP.Delete(r.PathValue("id"))
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
	if s.MCP == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	v, err := s.MCP.Refresh(r.PathValue("id"))
	if errors.Is(err, mcp.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	// refresh may return view + error (probe failed but state saved)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "refresh_failed", "message": err.Error(), "server": v})
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) listMcpTools(w http.ResponseWriter, _ *http.Request) {
	if s.MCP == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	tools, err := s.MCP.EnabledTools()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, tools)
}

func (s *Server) callMcpTool(w http.ResponseWriter, r *http.Request) {
	if s.MCP == nil {
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
	res, err := s.MCP.Call(body.ServerID, body.Name, body.Arguments)
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
