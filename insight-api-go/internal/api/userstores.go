package api

import (
	"net/http"
	"path/filepath"
	"sync"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userid"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userscope"
)

// userStores caches per-user Skills/MCP stores keyed by user id.
type userStores struct {
	mu     sync.Mutex
	skills map[string]*skills.Store
	mcp    map[string]*mcp.Store
}

func newUserStores() *userStores {
	return &userStores{
		skills: map[string]*skills.Store{},
		mcp:    map[string]*mcp.Store{},
	}
}

func (s *Server) skillsFor(r *http.Request) (*skills.Store, error) {
	if s.DataDir == "" {
		return s.Skills, nil
	}
	uid := userid.FromRequest(r)
	s.stores.mu.Lock()
	defer s.stores.mu.Unlock()
	if st, ok := s.stores.skills[uid]; ok {
		return st, nil
	}
	st, err := skills.NewStore(userscope.UserRoot(s.DataDir, uid))
	if err != nil {
		return nil, err
	}
	if s.SkillsSeed != "" {
		_ = st.SeedOfficial(s.SkillsSeed)
	}
	s.stores.skills[uid] = st
	return st, nil
}

func (s *Server) mcpFor(r *http.Request) (*mcp.Store, error) {
	if s.DataDir == "" {
		return s.MCP, nil
	}
	uid := userid.FromRequest(r)
	s.stores.mu.Lock()
	defer s.stores.mu.Unlock()
	if st, ok := s.stores.mcp[uid]; ok {
		return st, nil
	}
	st, err := mcp.NewStore(userscope.UserRoot(s.DataDir, uid))
	if err != nil {
		return nil, err
	}
	s.stores.mcp[uid] = st
	return st, nil
}

// UserRootForTests exposes path helper for tests.
func UserRootForTests(dataDir, userID string) string {
	return filepath.Join(dataDir, "users", userid.Resolve(userID))
}
