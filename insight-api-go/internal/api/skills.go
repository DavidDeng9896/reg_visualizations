package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

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
	file, hdr, err := r.FormFile("file")
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
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "zip_too_large",
			"message": "file exceeds 2 MiB limit",
		})
		return
	}

	filename := ""
	if hdr != nil {
		filename = hdr.Filename
	}
	lower := strings.ToLower(filename)
	var info skills.Info
	switch {
	case strings.HasSuffix(lower, ".md"), strings.HasSuffix(lower, ".markdown"):
		info, err = st.ImportMarkdown(filename, raw)
	case strings.HasSuffix(lower, ".zip"), lower == "", looksLikeZip(raw):
		info, err = st.ImportZip(bytes.NewReader(raw), int64(len(raw)))
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "invalid_skill_package",
			"message": "unsupported file type; upload .zip (skill.json + SKILL.md) or .md",
		})
		return
	}

	if errors.Is(err, skills.ErrConflict) {
		writeErr(w, http.StatusConflict, "skill_id_conflict")
		return
	}
	if errors.Is(err, skills.ErrInvalidPackage) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "invalid_skill_package",
			"message": skillPackageMessage(err),
		})
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, info)
}

func looksLikeZip(raw []byte) bool {
	return len(raw) >= 4 && raw[0] == 'P' && raw[1] == 'K'
}

func skillPackageMessage(err error) string {
	msg := err.Error()
	const prefix = "invalid_skill_package: "
	if strings.HasPrefix(msg, prefix) {
		return strings.TrimPrefix(msg, prefix)
	}
	if msg == "invalid_skill_package" {
		return "invalid skill package; need skill.json + SKILL.md in the same folder, or a .md file"
	}
	return msg
}

func (s *Server) patchSkill(w http.ResponseWriter, r *http.Request) {
	st, err := s.skillsFor(r)
	if err != nil || st == nil {
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
	err = st.SetEnabled(r.PathValue("id"), *body.Enabled)
	if errors.Is(err, skills.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	d, err := st.Get(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
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
