package api

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/aifiles"
)

func (s *Server) listAiFiles(w http.ResponseWriter, r *http.Request) {
	st, err := s.filesFor(r)
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

func (s *Server) uploadAiFile(w http.ResponseWriter, r *http.Request) {
	st, err := s.filesFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusInternalServerError, "files_unavailable")
		return
	}
	if err := r.ParseMultipartForm(aifiles.MaxFileBytes + (1 << 20)); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing_file")
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(io.LimitReader(file, aifiles.MaxFileBytes+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if int64(len(raw)) > aifiles.MaxFileBytes {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "file_too_large",
			"message": aifiles.ErrMessage(aifiles.ErrTooLarge),
		})
		return
	}

	filename := ""
	if hdr != nil {
		filename = hdr.Filename
	}
	meta, err := st.Save(filename, raw)
	if errors.Is(err, aifiles.ErrTooLarge) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "file_too_large",
			"message": aifiles.ErrMessage(err),
		})
		return
	}
	if errors.Is(err, aifiles.ErrInvalidType) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "invalid_file_type",
			"message": aifiles.ErrMessage(err),
		})
		return
	}
	if errors.Is(err, aifiles.ErrInvalidInput) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "invalid_body",
			"message": aifiles.ErrMessage(err),
		})
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, meta)
}

func (s *Server) getAiFileMeta(w http.ResponseWriter, r *http.Request) {
	st, err := s.filesFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	meta, err := st.GetMeta(r.PathValue("id"))
	if errors.Is(err, aifiles.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, meta)
}

func (s *Server) downloadAiFile(w http.ResponseWriter, r *http.Request) {
	st, err := s.filesFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	f, meta, err := st.OpenBlob(r.PathValue("id"))
	if errors.Is(err, aifiles.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	defer f.Close()

	mime := meta.Mime
	if mime == "" {
		mime = "application/octet-stream"
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Content-Length", strconv.FormatInt(meta.SizeBytes, 10))
	w.Header().Set("Content-Disposition", contentDisposition(meta.Name))
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, f)
}

func (s *Server) deleteAiFile(w http.ResponseWriter, r *http.Request) {
	st, err := s.filesFor(r)
	if err != nil || st == nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	err = st.Delete(r.PathValue("id"))
	if errors.Is(err, aifiles.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func contentDisposition(name string) string {
	name = strings.ReplaceAll(name, `"`, `'`)
	name = strings.ReplaceAll(name, "\n", " ")
	name = strings.ReplaceAll(name, "\r", " ")
	if name == "" {
		name = "file"
	}
	return fmt.Sprintf(`attachment; filename="%s"`, name)
}
