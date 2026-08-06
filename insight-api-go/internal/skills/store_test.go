package skills_test

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
)

func TestImportListGetEnableDelete(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}

	// seed official
	off := filepath.Join(root, "seed", "chart-best-practices")
	_ = os.MkdirAll(off, 0o755)
	_ = os.WriteFile(filepath.Join(off, "skill.json"), []byte(`{"id":"chart-best-practices","name":"Chart best practices","version":"1.0.0","description":"How to configure charts"}`), 0o644)
	_ = os.WriteFile(filepath.Join(off, "SKILL.md"), []byte("# Charts\nUse existing chart tools."), 0o644)
	if err := st.SeedOfficial(filepath.Join(root, "seed")); err != nil {
		t.Fatal(err)
	}

	list, err := st.List()
	if err != nil || len(list) != 1 || list[0].ID != "chart-best-practices" || !list[0].Enabled {
		t.Fatalf("list=%v err=%v", list, err)
	}

	zipBytes, err := skills.ZipBytes(map[string]string{
		"my-skill/skill.json": `{"id":"my-skill","name":"My Skill","version":"0.1.0","description":"demo"}`,
		"my-skill/SKILL.md":   "# Hello\nWorld",
	})
	if err != nil {
		t.Fatal(err)
	}
	info, err := st.ImportZip(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil || info.ID != "my-skill" || info.Source != "user" {
		t.Fatalf("import=%v err=%v", info, err)
	}

	// conflict
	_, err = st.ImportZip(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != skills.ErrConflict {
		t.Fatalf("want conflict got %v", err)
	}

	d, err := st.Get("my-skill")
	if err != nil || d.Body == "" || !bytes.Contains([]byte(d.Body), []byte("Hello")) {
		t.Fatalf("get=%v err=%v", d, err)
	}

	if err := st.SetEnabled("my-skill", false); err != nil {
		t.Fatal(err)
	}
	d, _ = st.Get("my-skill")
	if d.Enabled {
		t.Fatal("expected disabled")
	}

	if err := st.Delete("chart-best-practices"); err != skills.ErrForbidden {
		t.Fatalf("delete official: %v", err)
	}
	if err := st.Delete("my-skill"); err != nil {
		t.Fatal(err)
	}
	if _, err := st.Get("my-skill"); err != skills.ErrNotFound {
		t.Fatalf("want not found got %v", err)
	}
}

func TestRejectPathTraversal(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}
	zipBytes, err := skills.ZipBytes(map[string]string{
		"../evil/skill.json": `{"id":"evil","name":"x","version":"1","description":"d"}`,
		"../evil/SKILL.md":   "x",
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = st.ImportZip(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err == nil {
		t.Fatal("expected invalid package")
	}
}

func TestImportZipCaseInsensitiveNames(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}
	zipBytes, err := skills.ZipBytes(map[string]string{
		"pkg/Skill.json": `{"id":"case-skill","version":"1.0.0","description":"d"}`,
		"pkg/skill.md":   "# Case Skill\nBody",
	})
	if err != nil {
		t.Fatal(err)
	}
	info, err := st.ImportZip(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	if info.ID != "case-skill" || info.Name != "case-skill" {
		t.Fatalf("info=%+v", info)
	}
	d, err := st.Get("case-skill")
	if err != nil || !bytes.Contains([]byte(d.Body), []byte("Body")) {
		t.Fatalf("get=%v err=%v", d, err)
	}
}

func TestImportZipMissingSkillMDMessage(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}
	zipBytes, err := skills.ZipBytes(map[string]string{
		"only/skill.json": `{"id":"x","name":"X","version":"1","description":"d"}`,
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = st.ImportZip(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err == nil || !strings.Contains(err.Error(), "missing SKILL.md") {
		t.Fatalf("want missing SKILL.md got %v", err)
	}
}

func TestImportMarkdownWithFrontmatter(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}
	md := "---\nid: fm-skill\nname: Frontmatter Skill\ndescription: demo\ntags: a, b\n---\n# Hello\nWorld\n"
	info, err := st.ImportMarkdown("ignored.md", []byte(md))
	if err != nil {
		t.Fatal(err)
	}
	if info.ID != "fm-skill" || info.Name != "Frontmatter Skill" || len(info.Tags) != 2 {
		t.Fatalf("info=%+v", info)
	}
	d, err := st.Get("fm-skill")
	if err != nil || !strings.Contains(d.Body, "# Hello") || strings.Contains(d.Body, "---") {
		t.Fatalf("body=%q err=%v", d.Body, err)
	}
}

func TestImportMarkdownFromFilename(t *testing.T) {
	root := t.TempDir()
	st, err := skills.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}
	info, err := st.ImportMarkdown("My Cool Skill.md", []byte("# Title From Heading\nDo things.\n"))
	if err != nil {
		t.Fatal(err)
	}
	if info.ID != "my-cool-skill" {
		t.Fatalf("id=%q", info.ID)
	}
	if info.Name != "Title From Heading" {
		t.Fatalf("name=%q", info.Name)
	}
}

