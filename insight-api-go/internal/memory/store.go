package memory

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

var (
	ErrNotFound = errors.New("not_found")
	ErrBadInput = errors.New("invalid_body")
	ErrTooMany  = errors.New("too_many")
)

const (
	maxContentRunes = 2000
	maxMemories     = 100
)

type Record struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Store struct {
	Path string
}

func NewStore(dataDir string) (*Store, error) {
	if dataDir == "" {
		return nil, errors.New("memory data dir required")
	}
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}
	return &Store{Path: filepath.Join(dataDir, "ai-memories.json")}, nil
}

func (s *Store) load() ([]Record, error) {
	raw, err := os.ReadFile(s.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return []Record{}, nil
		}
		return nil, err
	}
	var list []Record
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []Record{}
	}
	return list, nil
}

func (s *Store) save(list []Record) error {
	raw, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.Path, raw, 0o600)
}

// List returns memories newest-first.
func (s *Store) List() ([]Record, error) {
	list, err := s.load()
	if err != nil {
		return nil, err
	}
	out := make([]Record, len(list))
	for i := range list {
		out[len(list)-1-i] = list[i]
	}
	return out, nil
}

func (s *Store) Create(content string) (Record, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return Record{}, ErrBadInput
	}
	if utf8.RuneCountInString(content) > maxContentRunes {
		return Record{}, ErrBadInput
	}
	list, err := s.load()
	if err != nil {
		return Record{}, err
	}
	if len(list) >= maxMemories {
		return Record{}, ErrTooMany
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	rec := Record{ID: uuid.NewString(), Content: content, CreatedAt: now, UpdatedAt: now}
	list = append(list, rec)
	if err := s.save(list); err != nil {
		return Record{}, err
	}
	return rec, nil
}

func (s *Store) Delete(id string) error {
	list, err := s.load()
	if err != nil {
		return err
	}
	i := -1
	for idx, r := range list {
		if r.ID == id {
			i = idx
			break
		}
	}
	if i < 0 {
		return ErrNotFound
	}
	list = append(list[:i], list[i+1:]...)
	return s.save(list)
}
