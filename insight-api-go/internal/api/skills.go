package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
)

func (s *Server) listSkills(w http.ResponseWriter, r *http.Request) {
	st, err := s.skillsFor(r)
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

func (s *Server) getSkill(w http.ResponseWriter, r *http.Request) {
	st, err := s.skillsFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	d, err := st.Get(r.PathValue("id"))
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
	st, err := s.skillsFor(r)
	if err != nil || st == nil {
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
	info, err := st.ImportZip(bytes.NewReader(raw), int64(len(raw)))
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
	st, err := s.skillsFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Enabled *bool   `json:"enabled"`
		Body    *string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if body.Enabled == nil && body.Body == nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	id := r.PathValue("id")
	if body.Enabled != nil {
		err = st.SetEnabled(id, *body.Enabled)
		if errors.Is(err, skills.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "not_found")
			return
		}
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "internal")
			return
		}
	}
	if body.Body != nil {
		err = st.UpdateBody(id, *body.Body)
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
	}
	d, err := st.Get(id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	if body.Body != nil {
		writeJSON(w, http.StatusOK, d)
		return
	}
	writeJSON(w, http.StatusOK, d.Info)
}

func (s *Server) deleteSkill(w http.ResponseWriter, r *http.Request) {
	st, err := s.skillsFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err = st.Delete(r.PathValue("id"))
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
