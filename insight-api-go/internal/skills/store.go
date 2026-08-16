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

const MaxZipBytes = 2 << 20 // 2 MiB（zip 与单文件 .md 共用上限）

var (
	ErrInvalidPackage = errors.New("invalid_skill_package")
	ErrConflict       = errors.New("skill_id_conflict")
	ErrNotFound       = errors.New("not_found")
	ErrForbidden      = errors.New("forbidden")
)

func packageErr(reason string) error {
	return fmt.Errorf("%w: %s", ErrInvalidPackage, reason)
}

func isSkillJSONBase(base string) bool {
	return strings.EqualFold(base, "skill.json")
}

func isSkillMDBase(base string) bool {
	return strings.EqualFold(base, "skill.md")
}

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
// Accepts skill.json / SKILL.md with any common casing; writes canonical names.
func (s *Store) ImportZip(r io.ReaderAt, size int64) (Info, error) {
	if size <= 0 {
		return Info{}, packageErr("empty zip")
	}
	if size > MaxZipBytes {
		return Info{}, packageErr("zip too large")
	}
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return Info{}, packageErr("not a valid zip archive")
	}

	var jsonPath, mdPath string
	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.Contains(name, "..") {
			return Info{}, packageErr("path traversal not allowed")
		}
		if f.FileInfo().IsDir() || strings.HasSuffix(name, "/") {
			continue
		}
		base := filepath.Base(name)
		if isSkillJSONBase(base) {
			jsonPath = name
		}
		if isSkillMDBase(base) {
			mdPath = name
		}
	}
	if jsonPath == "" && mdPath == "" {
		return Info{}, packageErr("missing skill.json and SKILL.md (zip must contain both in the same folder)")
	}
	if jsonPath == "" {
		return Info{}, packageErr("missing skill.json")
	}
	if mdPath == "" {
		return Info{}, packageErr("missing SKILL.md (filename must be SKILL.md / skill.md)")
	}
	root := filepath.ToSlash(filepath.Dir(jsonPath))
	if filepath.ToSlash(filepath.Dir(mdPath)) != root {
		return Info{}, packageErr("skill.json and SKILL.md must be in the same folder")
	}

	rawJSON, err := readZipFile(zr, jsonPath)
	if err != nil {
		return Info{}, packageErr("cannot read skill.json")
	}
	var m Meta
	if err := json.Unmarshal(rawJSON, &m); err != nil {
		return Info{}, packageErr("skill.json is not valid JSON")
	}
	m = normalizeMeta(m, "")
	if strings.TrimSpace(m.ID) == "" {
		return Info{}, packageErr("skill.json.id is required")
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

	wroteJSON, wroteMD := false, false
	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.Contains(name, "..") {
			_ = os.RemoveAll(dest)
			return Info{}, packageErr("path traversal not allowed")
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
		base := filepath.Base(rel)
		outName := ""
		switch {
		case isSkillJSONBase(base):
			outName = "skill.json"
		case isSkillMDBase(base):
			outName = "SKILL.md"
		case strings.HasSuffix(strings.ToLower(base), ".md"):
			outName = base
		default:
			continue
		}
		target := filepath.Join(dest, outName)
		if !strings.HasPrefix(target, dest+string(os.PathSeparator)) && target != dest {
			_ = os.RemoveAll(dest)
			return Info{}, packageErr("invalid extract path")
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, err
		}
		data, err := readZipFile(zr, name)
		if err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, packageErr("cannot read zip entry")
		}
		if outName == "skill.json" {
			// rewrite normalized meta so List/Get always see id+name
			raw, _ := json.MarshalIndent(m, "", "  ")
			data = append(raw, '\n')
			wroteJSON = true
		}
		if outName == "SKILL.md" {
			wroteMD = true
		}
		if err := os.WriteFile(target, data, 0o644); err != nil {
			_ = os.RemoveAll(dest)
			return Info{}, err
		}
	}
	if !wroteJSON || !wroteMD {
		_ = os.RemoveAll(dest)
		return Info{}, packageErr("failed to extract skill.json / SKILL.md")
	}

	st := s.loadState()
	st[m.ID] = true
	_ = s.saveState(st)

	return Info{Meta: m, Source: "user", Enabled: true}, nil
}

// ImportMarkdown creates a user skill from a single .md file.
// Optional YAML-like frontmatter:
//
//	---
//	id: my-skill
//	name: My Skill
//	description: ...
//	version: 0.1.0
//	tags: a, b
//	---
//	# body
func (s *Store) ImportMarkdown(filename string, content []byte) (Info, error) {
	if len(content) == 0 {
		return Info{}, packageErr("markdown file is empty")
	}
	if int64(len(content)) > MaxZipBytes {
		return Info{}, packageErr("markdown file too large")
	}
	m, body := parseSkillMarkdown(filename, string(content))
	m = normalizeMeta(m, filename)
	if strings.TrimSpace(m.ID) == "" {
		return Info{}, packageErr("cannot derive skill id from filename; add frontmatter id: ...")
	}
	if _, _, err := s.resolveDir(m.ID); err == nil {
		return Info{}, ErrConflict
	}

	dest := filepath.Join(s.userDir(), m.ID)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return Info{}, err
	}
	raw, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		_ = os.RemoveAll(dest)
		return Info{}, err
	}
	if err := os.WriteFile(filepath.Join(dest, "skill.json"), append(raw, '\n'), 0o644); err != nil {
		_ = os.RemoveAll(dest)
		return Info{}, err
	}
	if err := os.WriteFile(filepath.Join(dest, "SKILL.md"), []byte(body), 0o644); err != nil {
		_ = os.RemoveAll(dest)
		return Info{}, err
	}

	st := s.loadState()
	st[m.ID] = true
	_ = s.saveState(st)
	return Info{Meta: m, Source: "user", Enabled: true}, nil
}

func normalizeMeta(m Meta, filenameHint string) Meta {
	m.ID = strings.TrimSpace(m.ID)
	m.Name = strings.TrimSpace(m.Name)
	m.Version = strings.TrimSpace(m.Version)
	m.Description = strings.TrimSpace(m.Description)
	if m.ID == "" && filenameHint != "" {
		m.ID = slugFromFilename(filenameHint)
	}
	if m.Name == "" {
		m.Name = m.ID
	}
	if m.Version == "" {
		m.Version = "0.1.0"
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}
	return m
}

func slugFromFilename(name string) string {
	base := filepath.Base(name)
	base = strings.TrimSuffix(base, filepath.Ext(base))
	base = strings.TrimSpace(base)
	if base == "" {
		return ""
	}
	var b strings.Builder
	prevDash := false
	for _, r := range strings.ToLower(base) {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_'
		if ok {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-_")
	return out
}

func parseSkillMarkdown(filename, text string) (Meta, string) {
	text = strings.TrimPrefix(text, "\ufeff")
	m := Meta{}
	body := text
	trimmed := strings.TrimLeft(text, " \t\r\n")
	if !strings.HasPrefix(trimmed, "---") {
		// use first markdown heading as name if present
		if name := firstMarkdownHeading(text); name != "" {
			m.Name = name
		}
		return m, body
	}
	// find closing ---
	rest := trimmed[3:]
	rest = strings.TrimLeft(rest, "\r\n")
	end := -1
	for i := 0; i < len(rest)-2; i++ {
		if rest[i] == '-' && rest[i+1] == '-' && rest[i+2] == '-' {
			// line start
			if i == 0 || rest[i-1] == '\n' {
				end = i
				break
			}
		}
	}
	if end < 0 {
		return m, body
	}
	fm := rest[:end]
	body = strings.TrimLeft(rest[end+3:], "\r\n")
	for _, line := range strings.Split(fm, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		val = strings.TrimSpace(val)
		val = strings.Trim(val, `"'`)
		switch key {
		case "id":
			m.ID = val
		case "name", "title":
			m.Name = val
		case "description", "desc":
			m.Description = val
		case "version":
			m.Version = val
		case "tags":
			m.Tags = splitTags(val)
		}
	}
	if m.Name == "" {
		if name := firstMarkdownHeading(body); name != "" {
			m.Name = name
		}
	}
	_ = filename
	return m, body
}

func splitTags(val string) []string {
	val = strings.TrimSpace(val)
	if val == "" {
		return []string{}
	}
	val = strings.TrimPrefix(val, "[")
	val = strings.TrimSuffix(val, "]")
	parts := strings.FieldsFunc(val, func(r rune) bool {
		return r == ',' || r == ' '
	})
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.Trim(p, `"'`)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func firstMarkdownHeading(text string) string {
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") {
			return strings.TrimSpace(strings.TrimLeft(line, "#"))
		}
	}
	return ""
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
