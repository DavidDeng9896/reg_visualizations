package userscope

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
)

func TestMigrateOnceMovesLegacyToDavidAndSeedsBoth(t *testing.T) {
	dir := t.TempDir()
	// Legacy skills + state + mcp
	legacySkill := filepath.Join(dir, "skills", "user", "my-skill")
	if err := os.MkdirAll(legacySkill, 0o755); err != nil {
		t.Fatal(err)
	}
	meta := `{"id":"my-skill","name":"My","version":"1.0.0","description":"d"}`
	if err := os.WriteFile(filepath.Join(legacySkill, "skill.json"), []byte(meta), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(legacySkill, "SKILL.md"), []byte("# hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "skills-state.json"), []byte(`{"my-skill":{"enabled":false}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "mcp-servers.json"), []byte(`[{"id":"s1","name":"S","url":"http://x","headers":[],"enabled":true}]`), 0o600); err != nil {
		t.Fatal(err)
	}

	// Official seed source
	seed := filepath.Join(dir, "seed", "chart-best-practices")
	if err := os.MkdirAll(seed, 0o755); err != nil {
		t.Fatal(err)
	}
	seedMeta := `{"id":"chart-best-practices","name":"Charts","version":"1.0.0","description":"c"}`
	_ = os.WriteFile(filepath.Join(seed, "skill.json"), []byte(seedMeta), 0o644)
	_ = os.WriteFile(filepath.Join(seed, "SKILL.md"), []byte("# charts"), 0o644)

	if err := MigrateOnce(dir, filepath.Join(dir, "seed")); err != nil {
		t.Fatal(err)
	}

	davidRoot := UserRoot(dir, "david")
	if _, err := os.Stat(filepath.Join(davidRoot, "skills", "user", "my-skill", "skill.json")); err != nil {
		t.Fatalf("legacy skill not under david: %v", err)
	}
	if _, err := os.Stat(filepath.Join(davidRoot, "mcp-servers.json")); err != nil {
		t.Fatalf("mcp not under david: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "skills")); !os.IsNotExist(err) {
		t.Fatalf("legacy skills dir should be gone, err=%v", err)
	}

	dx := UserRoot(dir, "dengxiaowei")
	st, err := skills.NewStore(dx)
	if err != nil {
		t.Fatal(err)
	}
	list, err := st.List()
	if err != nil {
		t.Fatal(err)
	}
	foundOfficial := false
	for _, s := range list {
		if s.ID == "chart-best-practices" {
			foundOfficial = true
		}
		if s.ID == "my-skill" {
			t.Fatal("dengxiaowei should not see david's imported skill")
		}
	}
	if !foundOfficial {
		t.Fatal("dengxiaowei missing official seed")
	}

	// Idempotent
	if err := MigrateOnce(dir, filepath.Join(dir, "seed")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "users", ".migrated-v1")); err != nil {
		t.Fatal(err)
	}
}
