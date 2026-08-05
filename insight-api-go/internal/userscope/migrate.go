package userscope

import (
	"os"
	"path/filepath"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userid"
)

const migratedMarker = ".migrated-v1"

// UserRoot returns dataDir/users/<userId>.
func UserRoot(dataDir, userID string) string {
	return filepath.Join(dataDir, "users", userid.Resolve(userID))
}

// MigrateOnce moves legacy global Skills/MCP into david and seeds all users.
// Idempotent via dataDir/users/.migrated-v1.
func MigrateOnce(dataDir, officialSeed string) error {
	if dataDir == "" {
		return nil
	}
	usersDir := filepath.Join(dataDir, "users")
	if err := os.MkdirAll(usersDir, 0o755); err != nil {
		return err
	}
	marker := filepath.Join(usersDir, migratedMarker)
	if _, err := os.Stat(marker); err == nil {
		return EnsureUsers(dataDir, officialSeed)
	}

	davidRoot := UserRoot(dataDir, userid.DefaultUser)
	if err := os.MkdirAll(davidRoot, 0o755); err != nil {
		return err
	}

	// Move legacy paths into david if present.
	moves := []struct{ from, to string }{
		{filepath.Join(dataDir, "skills"), filepath.Join(davidRoot, "skills")},
		{filepath.Join(dataDir, "skills-state.json"), filepath.Join(davidRoot, "skills-state.json")},
		{filepath.Join(dataDir, "mcp-servers.json"), filepath.Join(davidRoot, "mcp-servers.json")},
	}
	for _, m := range moves {
		if err := moveIfExists(m.from, m.to); err != nil {
			return err
		}
	}

	if err := EnsureUsers(dataDir, officialSeed); err != nil {
		return err
	}
	return os.WriteFile(marker, []byte("1\n"), 0o644)
}

// EnsureUsers creates per-user roots and seeds official skills when missing.
func EnsureUsers(dataDir, officialSeed string) error {
	for _, id := range userid.All() {
		root := UserRoot(dataDir, id)
		st, err := skills.NewStore(root)
		if err != nil {
			return err
		}
		if officialSeed != "" {
			if err := st.SeedOfficial(officialSeed); err != nil {
				return err
			}
		}
		// Ensure mcp path parent exists (empty file created lazily by mcp.Store).
		if err := os.MkdirAll(root, 0o755); err != nil {
			return err
		}
	}
	return nil
}

func moveIfExists(from, to string) error {
	info, err := os.Stat(from)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if _, err := os.Stat(to); err == nil {
		// Destination already exists — leave source (do not clobber).
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(to), 0o755); err != nil {
		return err
	}
	if err := os.Rename(from, to); err != nil {
		// Cross-device fallback: copy then remove.
		if info.IsDir() {
			if err := copyDir(from, to); err != nil {
				return err
			}
			return os.RemoveAll(from)
		}
		data, err := os.ReadFile(from)
		if err != nil {
			return err
		}
		if err := os.WriteFile(to, data, 0o600); err != nil {
			return err
		}
		return os.Remove(from)
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
		return os.WriteFile(target, data, info.Mode())
	})
}
