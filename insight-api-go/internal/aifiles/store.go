package aifiles

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	MaxFileBytes = 10 << 20 // 10 MiB
	MaxList      = 200
)

var (
	ErrNotFound      = errors.New("not_found")
	ErrTooLarge      = errors.New("file_too_large")
	ErrInvalidType   = errors.New("invalid_file_type")
	ErrInvalidInput  = errors.New("invalid_body")
)

// Meta is persisted file metadata returned by the API.
type Meta struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Mime      string `json:"mime"`
	SizeBytes int64  `json:"sizeBytes"`
	CreatedAt string `json:"createdAt"`
	Kind      string `json:"kind"` // csv|text|pdf|excel|image|other
}

// Store keeps chat attachment blobs under root/files/ with a JSON index.
type Store struct {
	Root string // user data root (users/<id>/)
	mu   sync.Mutex
}

func NewStore(root string) (*Store, error) {
	if root == "" {
		return nil, errors.New("aifiles root required")
	}
	s := &Store{Root: root}
	if err := os.MkdirAll(s.filesDir(), 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(s.blobsDir(), 0o755); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) filesDir() string { return filepath.Join(s.Root, "files") }
func (s *Store) blobsDir() string { return filepath.Join(s.filesDir(), "blobs") }
func (s *Store) indexPath() string {
	return filepath.Join(s.filesDir(), "files.json")
}
func (s *Store) blobPath(id string) string {
	return filepath.Join(s.blobsDir(), id)
}

func (s *Store) loadIndex() ([]Meta, error) {
	raw, err := os.ReadFile(s.indexPath())
	if err != nil {
		if os.IsNotExist(err) {
			return []Meta{}, nil
		}
		return nil, err
	}
	var list []Meta
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []Meta{}
	}
	return list, nil
}

func (s *Store) saveIndex(list []Meta) error {
	raw, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.indexPath(), append(raw, '\n'), 0o600)
}

// List returns metadata newest-first (capped).
func (s *Store) List() ([]Meta, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	list, err := s.loadIndex()
	if err != nil {
		return nil, err
	}
	sort.SliceStable(list, func(i, j int) bool {
		return list[i].CreatedAt > list[j].CreatedAt
	})
	if len(list) > MaxList {
		list = list[:MaxList]
	}
	out := make([]Meta, len(list))
	copy(out, list)
	return out, nil
}

func (s *Store) GetMeta(id string) (Meta, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.findLocked(id)
}

func (s *Store) findLocked(id string) (Meta, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Meta{}, ErrNotFound
	}
	list, err := s.loadIndex()
	if err != nil {
		return Meta{}, err
	}
	for _, m := range list {
		if m.ID == id {
			return m, nil
		}
	}
	return Meta{}, ErrNotFound
}

// OpenBlob returns an open file handle for streaming. Caller must Close.
func (s *Store) OpenBlob(id string) (*os.File, Meta, error) {
	s.mu.Lock()
	meta, err := s.findLocked(id)
	s.mu.Unlock()
	if err != nil {
		return nil, Meta{}, err
	}
	f, err := os.Open(s.blobPath(id))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, Meta{}, ErrNotFound
		}
		return nil, Meta{}, err
	}
	return f, meta, nil
}

// Save validates type/size, writes blob + index entry.
func (s *Store) Save(filename string, data []byte) (Meta, error) {
	if len(data) == 0 {
		return Meta{}, ErrInvalidInput
	}
	if int64(len(data)) > MaxFileBytes {
		return Meta{}, ErrTooLarge
	}
	name := sanitizeFilename(filename)
	ext, kind, mime, ok := classify(name)
	if !ok {
		return Meta{}, ErrInvalidType
	}
	_ = ext

	id := uuid.NewString()
	meta := Meta{
		ID:        id,
		Name:      name,
		Mime:      mime,
		SizeBytes: int64(len(data)),
		CreatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Kind:      kind,
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.blobsDir(), 0o755); err != nil {
		return Meta{}, err
	}
	blob := s.blobPath(id)
	if err := os.WriteFile(blob, data, 0o600); err != nil {
		return Meta{}, err
	}
	list, err := s.loadIndex()
	if err != nil {
		_ = os.Remove(blob)
		return Meta{}, err
	}
	list = append(list, meta)
	if err := s.saveIndex(list); err != nil {
		_ = os.Remove(blob)
		return Meta{}, err
	}
	return meta, nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	id = strings.TrimSpace(id)
	if id == "" {
		return ErrNotFound
	}
	list, err := s.loadIndex()
	if err != nil {
		return err
	}
	i := -1
	for idx, m := range list {
		if m.ID == id {
			i = idx
			break
		}
	}
	if i < 0 {
		return ErrNotFound
	}
	list = append(list[:i], list[i+1:]...)
	if err := s.saveIndex(list); err != nil {
		return err
	}
	_ = os.Remove(s.blobPath(id))
	return nil
}

func sanitizeFilename(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == ".." {
		return "file"
	}
	return name
}

type typeInfo struct {
	kind string
	mime string
}

var allowedExt = map[string]typeInfo{
	".csv":      {kind: "csv", mime: "text/csv"},
	".txt":      {kind: "text", mime: "text/plain"},
	".md":       {kind: "text", mime: "text/markdown"},
	".markdown": {kind: "text", mime: "text/markdown"},
	".pdf":      {kind: "pdf", mime: "application/pdf"},
	".xlsx":     {kind: "excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
	".xls":      {kind: "excel", mime: "application/vnd.ms-excel"},
	".png":      {kind: "image", mime: "image/png"},
	".jpg":      {kind: "image", mime: "image/jpeg"},
	".jpeg":     {kind: "image", mime: "image/jpeg"},
	".gif":      {kind: "image", mime: "image/gif"},
	".webp":     {kind: "image", mime: "image/webp"},
}

func classify(filename string) (ext, kind, mime string, ok bool) {
	ext = strings.ToLower(filepath.Ext(filename))
	info, ok := allowedExt[ext]
	if !ok {
		return ext, "", "", false
	}
	return ext, info.kind, info.mime, true
}

// AllowedExtensions returns the list of allowed extensions (without dots), for error messages.
func AllowedExtensions() []string {
	out := make([]string, 0, len(allowedExt))
	for e := range allowedExt {
		out = append(out, strings.TrimPrefix(e, "."))
	}
	sort.Strings(out)
	return out
}

// FormatAllowed is a comma-separated extension list for API messages.
func FormatAllowed() string {
	return strings.Join(AllowedExtensions(), ", ")
}

// ValidateExt reports whether filename has an allowed extension.
func ValidateExt(filename string) bool {
	_, _, _, ok := classify(sanitizeFilename(filename))
	return ok
}

// ErrMessage returns a short public reason for Save/classify errors.
func ErrMessage(err error) string {
	switch {
	case errors.Is(err, ErrTooLarge):
		return fmt.Sprintf("file exceeds %d MiB limit", MaxFileBytes>>20)
	case errors.Is(err, ErrInvalidType):
		return "unsupported file type; allowed: " + FormatAllowed()
	case errors.Is(err, ErrInvalidInput):
		return "empty file"
	default:
		return err.Error()
	}
}
