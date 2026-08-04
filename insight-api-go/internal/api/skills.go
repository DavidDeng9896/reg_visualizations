package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
)

func (s *Server) listSkills(w http.ResponseWriter, _ *http.Request) {
	if s.Skills == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	list, err := s.Skills.List()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) getSkill(w http.ResponseWriter, r *http.Request) {
	if s.Skills == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	d, err := s.Skills.Get(r.PathValue("id"))
	if errors.Is(err, skills.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (s *Server) importSkill(w http.ResponseWriter, r *http.Request) {
	if s.Skills == nil {
		writeErr(w, http.StatusInternalServerError, "skills_unavailable")
		return
	}
	if err := r.ParseMultipartForm(skills.MaxZipBytes + (1 << 20)); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing_file")
		return
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, skills.MaxZipBytes+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if int64(len(raw)) > skills.MaxZipBytes {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "zip_too_large"})
		return
	}
	info, err := s.Skills.ImportZip(bytes.NewReader(raw), int64(len(raw)))
	if errors.Is(err, skills.ErrConflict) {
		writeErr(w, http.StatusConflict, "skill_id_conflict")
		return
	}
	if errors.Is(err, skills.ErrInvalidPackage) || err != nil && info.ID == "" {
		writeErr(w, http.StatusBadRequest, "invalid_skill_package")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, info)
}

func (s *Server) patchSkill(w http.ResponseWriter, r *http.Request) {
	if s.Skills == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Enabled *bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Enabled == nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	err := s.Skills.SetEnabled(r.PathValue("id"), *body.Enabled)
	if errors.Is(err, skills.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	d, err := s.Skills.Get(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, d.Info)
}

func (s *Server) deleteSkill(w http.ResponseWriter, r *http.Request) {
	if s.Skills == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err := s.Skills.Delete(r.PathValue("id"))
	if errors.Is(err, skills.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if errors.Is(err, skills.ErrForbidden) {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
