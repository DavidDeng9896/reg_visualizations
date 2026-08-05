package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/memory"
)

func (s *Server) listMemories(w http.ResponseWriter, r *http.Request) {
	st, err := s.memoryFor(r)
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

func (s *Server) createMemory(w http.ResponseWriter, r *http.Request) {
	st, err := s.memoryFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusInternalServerError, "memory_unavailable")
		return
	}
	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	rec, err := st.Create(body.Content)
	if errors.Is(err, memory.ErrBadInput) {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if errors.Is(err, memory.ErrTooMany) {
		writeErr(w, http.StatusConflict, "too_many")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, rec)
}

func (s *Server) deleteMemory(w http.ResponseWriter, r *http.Request) {
	st, err := s.memoryFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err = st.Delete(r.PathValue("id"))
	if errors.Is(err, memory.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
