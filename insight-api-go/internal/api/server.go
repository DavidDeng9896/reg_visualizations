package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/aifiles"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/memory"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

type Server struct {
	Store      *store.Store
	Mux        *http.ServeMux
	ConfigPath string        // AI 配置 JSON 路径；空则 data/ai-config.json
	DataDir    string        // when set, Skills/MCP/memory/files resolve under users/<id>/
	SkillsSeed string        // official skills seed source
	Skills     *skills.Store // legacy single-store fallback (tests / DataDir empty)
	MCP        *mcp.Store
	Memory     *memory.Store
	Files      *aifiles.Store // legacy single-store fallback (tests / DataDir empty)
	stores     *userStores
}

func New(s *store.Store) *Server {
	return NewWithOptions(s, "", "", "", nil, nil, nil)
}

func NewWithConfigPath(s *store.Store, configPath string) *Server {
	return NewWithOptions(s, configPath, "", "", nil, nil, nil)
}

// NewWithUserData wires per-user Skills/MCP/memory under dataDir/users/<userId>/.
func NewWithUserData(s *store.Store, configPath, dataDir, skillsSeed string) *Server {
	return NewWithOptions(s, configPath, dataDir, skillsSeed, nil, nil, nil)
}

func NewWithOptions(s *store.Store, configPath, dataDir, skillsSeed string, sk *skills.Store, mcpStore *mcp.Store, memStore *memory.Store) *Server {
	srv := &Server{
		Store: s, Mux: http.NewServeMux(), ConfigPath: configPath,
		DataDir: dataDir, SkillsSeed: skillsSeed, Skills: sk, MCP: mcpStore, Memory: memStore,
		stores: newUserStores(),
	}
	srv.routes()
	return srv
}

func (s *Server) routes() {
	s.Mux.HandleFunc("GET /health", s.health)
	s.Mux.HandleFunc("GET /api/analyses", s.listAnalyses)
	s.Mux.HandleFunc("GET /api/analyses/{id}", s.getAnalysis)
	s.Mux.HandleFunc("PUT /api/analyses/{id}", s.putAnalysis)
	s.Mux.HandleFunc("DELETE /api/analyses/{id}", s.deleteAnalysis)
	s.Mux.HandleFunc("GET /api/analyses/{id}/tables/{tableId}/snapshot", s.getSnapshot)
	s.Mux.HandleFunc("GET /api/dashboards", s.listDashboards)
	s.Mux.HandleFunc("GET /api/dashboards/{id}", s.getDashboard)
	s.Mux.HandleFunc("PUT /api/dashboards/{id}", s.putDashboard)
	s.Mux.HandleFunc("DELETE /api/dashboards/{id}", s.deleteDashboard)

	s.Mux.HandleFunc("GET /api/ai/config", s.getAiConfig)
	s.Mux.HandleFunc("PUT /api/ai/config", s.putAiConfig)
	s.Mux.HandleFunc("POST /api/ai/chat", s.postAiChat)
	s.Mux.HandleFunc("GET /api/ai/conversations", s.listAiConversations)
	s.Mux.HandleFunc("POST /api/ai/conversations", s.createAiConversation)
	s.Mux.HandleFunc("GET /api/ai/conversations/{id}", s.getAiConversation)
	s.Mux.HandleFunc("PUT /api/ai/conversations/{id}", s.putAiConversation)
	s.Mux.HandleFunc("DELETE /api/ai/conversations/{id}", s.deleteAiConversation)

	s.Mux.HandleFunc("GET /api/ai/skills", s.listSkills)
	s.Mux.HandleFunc("GET /api/ai/skills/{id}", s.getSkill)
	s.Mux.HandleFunc("POST /api/ai/skills/import", s.importSkill)
	s.Mux.HandleFunc("PATCH /api/ai/skills/{id}", s.patchSkill)
	s.Mux.HandleFunc("DELETE /api/ai/skills/{id}", s.deleteSkill)

	s.Mux.HandleFunc("GET /api/ai/files", s.listAiFiles)
	s.Mux.HandleFunc("POST /api/ai/files", s.uploadAiFile)
	s.Mux.HandleFunc("GET /api/ai/files/{id}/meta", s.getAiFileMeta)
	s.Mux.HandleFunc("GET /api/ai/files/{id}", s.downloadAiFile)
	s.Mux.HandleFunc("DELETE /api/ai/files/{id}", s.deleteAiFile)

	s.Mux.HandleFunc("GET /api/ai/mcp/servers", s.listMcpServers)
	s.Mux.HandleFunc("POST /api/ai/mcp/servers", s.createMcpServer)
	s.Mux.HandleFunc("PATCH /api/ai/mcp/servers/{id}", s.patchMcpServer)
	s.Mux.HandleFunc("DELETE /api/ai/mcp/servers/{id}", s.deleteMcpServer)
	s.Mux.HandleFunc("POST /api/ai/mcp/servers/{id}/refresh", s.refreshMcpServer)
	s.Mux.HandleFunc("GET /api/ai/mcp/tools", s.listMcpTools)
	s.Mux.HandleFunc("POST /api/ai/mcp/tools/call", s.callMcpTool)

	s.Mux.HandleFunc("GET /api/ai/memories", s.listMemories)
	s.Mux.HandleFunc("POST /api/ai/memories", s.createMemory)
	s.Mux.HandleFunc("DELETE /api/ai/memories/{id}", s.deleteMemory)

	s.Mux.HandleFunc("POST /api/python/execute", s.postPythonExecute)
	s.Mux.HandleFunc("GET /api/python/health", s.getPythonHealth)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, If-Match, X-User-Id")
		w.Header().Set("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) Handler() http.Handler {
	return withCORS(s.Mux)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]any{"error": code})
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "insight-api",
		"storage": "mariadb",
		"runtime": "go",
		"note":    "MariaDB schema; see internal/store/schema.sql",
	})
}

func (s *Server) listAnalyses(w http.ResponseWriter, _ *http.Request) {
	list, err := s.Store.ListAnalyses("")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) getAnalysis(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	doc, ok, err := s.Store.GetAnalysis(id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) putAnalysis(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	body, err := io.ReadAll(io.LimitReader(r.Body, 256<<20)) // 256MB
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	var doc store.AnalysisDoc
	dec := json.NewDecoder(strings.NewReader(string(body)))
	dec.UseNumber()
	if err := dec.Decode(&doc); err != nil || doc == nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if existingID, _ := doc["id"].(string); existingID != "" && existingID != id {
		writeErr(w, http.StatusBadRequest, "id_mismatch")
		return
	}
	doc["id"] = id

	ifMatch := r.Header.Get("If-Match")
	if ifMatch != "" {
		existing, ok, err := s.Store.GetAnalysis(id)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "internal")
			return
		}
		if ok {
			expected, err := strconv.ParseInt(ifMatch, 10, 64)
			if err == nil {
				cur := int64(0)
				switch v := existing["revision"].(type) {
				case float64:
					cur = int64(v)
				case json.Number:
					cur, _ = v.Int64()
				case int64:
					cur = v
				}
				if cur != expected {
					writeJSON(w, http.StatusConflict, map[string]any{
						"error":           "revision_conflict",
						"currentRevision": cur,
					})
					return
				}
			}
		}
	}

	saved, err := s.Store.PutAnalysis(doc, "")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (s *Server) deleteAnalysis(w http.ResponseWriter, r *http.Request) {
	ok, err := s.Store.DeleteAnalysis(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getSnapshot(w http.ResponseWriter, r *http.Request) {
	snap, err := s.Store.GetLatestSnapshot(r.PathValue("id"), r.PathValue("tableId"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if snap == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, snap)
}

func (s *Server) listDashboards(w http.ResponseWriter, _ *http.Request) {
	list, err := s.Store.ListDashboards("")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) getDashboard(w http.ResponseWriter, r *http.Request) {
	doc, ok, err := s.Store.GetDashboard(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) putDashboard(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var doc store.DashboardDoc
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil || doc == nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	doc["id"] = id
	saved, err := s.Store.PutDashboard(doc, "")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (s *Server) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	ok, err := s.Store.DeleteDashboard(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
