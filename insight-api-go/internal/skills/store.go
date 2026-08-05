package skills

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const MaxZipBytes = 2 << 20 // 2 MiB

var (
	ErrInvalidPackage = errors.New("invalid_skill_package")
	ErrConflict       = errors.New("skill_id_conflict")
	ErrNotFound       = errors.New("not_found")
	ErrForbidden      = errors.New("forbidden")
)

type Meta struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Version     string   `json:"version"`
	Description string   `json:"description"`
	Tags        []string `json:"tags,omitempty"`
}

type Info struct {
	Meta
	Source  string `json:"source"` // official | user
	Enabled bool   `json:"enabled"`
}

type Detail struct {
	Info
	Body string `json:"body"` // SKILL.md
}

type Store struct {
	Root string // data dir containing skills/ and skills-state.json
}

func NewStore(root string) (*Store, error) {
	if root == "" {
		return nil, errors.New("skills root required")
	}
	s := &Store{Root: root}
	for _, p := range []string{s.officialDir(), s.userDir()} {
		if err := os.MkdirAll(p, 0o755); err != nil {
			return nil, err
		}
	}
	return s, nil
}

func (s *Store) officialDir() string { return filepath.Join(s.Root, "skills", "official") }
func (s *Store) userDir() string     { return filepath.Join(s.Root, "skills", "user") }
func (s *Store) statePath() string   { return filepath.Join(s.Root, "skills-state.json") }

func (s *Store) loadState() map[string]bool {
	out := map[string]bool{}
	raw, err := os.ReadFile(s.statePath())
	if err != nil {
		return out
	}
	var wrap map[string]struct {
		Enabled bool `json:"enabled"`
	}
	if json.Unmarshal(raw, &wrap) != nil {
		return out
	}
	for id, v := range wrap {
		out[id] = v.Enabled
	}
	return out
}

func (s *Store) saveState(st map[string]bool) error {
	wrap := map[string]map[string]bool{}
	for id, en := range st {
		wrap[id] = map[string]bool{"enabled": en}
	}
	raw, err := json.MarshalIndent(wrap, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.statePath(), raw, 0o600)
}

func readMeta(dir string) (Meta, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "skill.json"))
	if err != nil {
		return Meta{}, err
	}
	var m Meta
	if err := json.Unmarshal(raw, &m); err != nil {
		return Meta{}, err
	}
	if strings.TrimSpace(m.ID) == "" || strings.TrimSpace(m.Name) == "" {
		return Meta{}, ErrInvalidPackage
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}
	return m, nil
}

func (s *Store) scan(source, base string, state map[string]bool) ([]Info, error) {
	entries, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	out := make([]Info, 0)
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(base, e.Name())
		m, err := readMeta(dir)
		if err != nil {
			continue
		}
		en, ok := state[m.ID]
		if !ok {
			en = true // default enabled
		}
		out = append(out, Info{Meta: m, Source: source, Enabled: en})
	}
	return out, nil
}

func (s *Store) List() ([]Info, error) {
	state := s.loadState()
	off, err := s.scan("official", s.officialDir(), state)
	if err != nil {
		return nil, err
	}
	usr, err := s.scan("user", s.userDir(), state)
	if err != nil {
		return nil, err
	}
	return append(off, usr...), nil
}

func (s *Store) resolveDir(id string) (dir, source string, err error) {
	u := filepath.Join(s.userDir(), id)
	if _, e := os.Stat(filepath.Join(u, "skill.json")); e == nil {
		return u, "user", nil
	}
	o := filepath.Join(s.officialDir(), id)
	if _, e := os.Stat(filepath.Join(o, "skill.json")); e == nil {
		return o, "official", nil
	}
	return "", "", ErrNotFound
}

func (s *Store) Get(id string) (Detail, error) {
	dir, source, err := s.resolveDir(id)
	if err != nil {
		return Detail{}, err
	}
	m, err := readMeta(dir)
	if err != nil {
		return Detail{}, err
	}
	body, err := os.ReadFile(filepath.Join(dir, "SKILL.md"))
	if err != nil {
		return Detail{}, err
	}
	state := s.loadState()
	en, ok := state[id]
	if !ok {
		en = true
	}
	return Detail{
		Info: Info{Meta: m, Source: source, Enabled: en},
		Body: string(body),
	}, nil
}

func (s *Store) SetEnabled(id string, enabled bool) error {
	if _, _, err := s.resolveDir(id); err != nil {
		return err
	}
	st := s.loadState()
	st[id] = enabled
	return s.saveState(st)
}

// UpdateBody writes SKILL.md for a user skill. Official skills → ErrForbidden.
func (s *Store) UpdateBody(id, body string) error {
	dir, source, err := s.resolveDir(id)
	if err != nil {
		return err
	}
	if source == "official" {
		return ErrForbidden
	}
	path := filepath.Join(dir, "SKILL.md")
	return os.WriteFile(path, []byte(body), 0o644)
}

func (s *Store) Delete(id string) error {
	dir, source, err := s.resolveDir(id)
	if err != nil {
		return err
	}
	if source == "official" {
		return ErrForbidden
	}
	if err := os.RemoveAll(dir); err != nil {
		return err
	}
	st := s.loadState()
	delete(st, id)
	_ = s.saveState(st)
	return nil
}

// ImportZip extracts a skill zip into user skills. Returns meta.
func (s *Store) ImportZip(r io.ReaderAt, size int64) (Info, error) {
	if size <= 0 || size > MaxZipBytes {
		return Info{}, fmt.Errorf("%w: zip too large", ErrInvalidPackage)
	}
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return Info{}, ErrInvalidPackage
	}

	// Find package root: either "" or single top-level dir
	var jsonPath, mdPath string
	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.Contains(name, "..") {
			return Info{}, ErrInvalidPackage
		}
		base := filepath.Base(name)
		if base == "skill.json" && !f.FileInfo().IsDir() {
			jsonPath = name
		}
		if base == "SKILL.md" && !f.FileInfo().IsDir() {
			mdPath = name
		}
	}
	if jsonPath == "" || mdPath == "" {
		return Info{}, ErrInvalidPackage
	}
	root := filepath.ToSlash(filepath.Dir(jsonPath))
	if filepath.ToSlash(filepath.Dir(mdPath)) != root {
		return Info{}, ErrInvalidPackage
	}

	rawJSON, err := readZipFile(zr, jsonPath)
	if err != nil {
		return Info{}, ErrInvalidPackage
	}
	var m Meta
	if err := json.Unmarshal(rawJSON, &m); err != nil || strings.TrimSpace(m.ID) == "" {
		return Info{}, ErrInvalidPackage
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}
	if _, _, err := s.resolveDir(m.ID); err == nil {
		return Info{}, ErrConflict
	}

	dest := filepath.Join(s.userDir(), m.ID)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return Info{}, err
	}

	prefix := root
	if prefix != "." && prefix != "" {
		prefix = strings.TrimSuffix(prefix, "/") + "/"
	} else {
		prefix = ""
	}

	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.Contains(name, "..") {
			_ = os.RemoveAll(dest)
			return Info{}, ErrInvalidPackage
		}
		rel := name
		if prefix != "" {
			if !strings.HasPrefix(name, prefix) {
				continue
			}
			rel = strings.TrimPrefix(name, prefix)
		}
		if rel == "" || strings.HasSuffix(name, "/") {
			continue
		}
		// only allow skill.json, SKILL.md, and other .md
		base := filepath.Base(rel)
		if base != "skill.json" && base != "SKILL.md" && !strings.HasSuffix(strings.ToLower(base), ".md") {
			continue
		}
		target := filepath.Join(dest, filepath.FromSlash(rel))
		if !strings.HasPrefix(target, dest+string(os.PathSeparator)) && target != dest {
			_ = os.RemoveAll(dest)
			return Info{}, ErrInvalidPackage
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, err
		}
		data, err := readZipFile(zr, name)
		if err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, err
		}
		if err := os.WriteFile(target, data, 0o644); err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, err
		}
	}

	st := s.loadState()
	st[m.ID] = true
	_ = s.saveState(st)

	return Info{Meta: m, Source: "user", Enabled: true}, nil
}

func readZipFile(zr *zip.Reader, name string) ([]byte, error) {
	for _, f := range zr.File {
		if filepath.ToSlash(f.Name) != name {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		return io.ReadAll(io.LimitReader(rc, MaxZipBytes))
	}
	return nil, os.ErrNotExist
}

// SeedOfficial copies built-in official skills from srcDir into store if missing.
func (s *Store) SeedOfficial(srcDir string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		src := filepath.Join(srcDir, e.Name())
		m, err := readMeta(src)
		if err != nil {
			continue
		}
		dest := filepath.Join(s.officialDir(), m.ID)
		if _, err := os.Stat(filepath.Join(dest, "skill.json")); err == nil {
			continue
		}
		if err := copyDir(src, dest); err != nil {
			return err
		}
	}
	return nil
}

func copyDir(src, dest string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dest, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return os.WriteFile(target, data, 0o644)
	})
}

// ZipBytes helper for tests.
func ZipBytes(files map[string]string) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, content := range files {
		w, err := zw.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err := w.Write([]byte(content)); err != nil {
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
