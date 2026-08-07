package aifiles_test

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/aifiles"
)

func TestSaveListGetDelete(t *testing.T) {
	root := t.TempDir()
	st, err := aifiles.NewStore(root)
	if err != nil {
		t.Fatal(err)
	}

	meta, err := st.Save("report.csv", []byte("a,b\n1,2\n"))
	if err != nil {
		t.Fatal(err)
	}
	if meta.ID == "" || meta.Name != "report.csv" || meta.Kind != "csv" || meta.Mime != "text/csv" {
		t.Fatalf("meta=%+v", meta)
	}
	if meta.SizeBytes != 8 {
		t.Fatalf("size=%d", meta.SizeBytes)
	}

	list, err := st.List()
	if err != nil || len(list) != 1 || list[0].ID != meta.ID {
		t.Fatalf("list=%v err=%v", list, err)
	}

	got, err := st.GetMeta(meta.ID)
	if err != nil || got.ID != meta.ID {
		t.Fatalf("get=%v err=%v", got, err)
	}

	f, m, err := st.OpenBlob(meta.ID)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	buf := make([]byte, 64)
	n, _ := f.Read(buf)
	if m.ID != meta.ID || string(buf[:n]) != "a,b\n1,2\n" {
		t.Fatalf("blob=%q meta=%+v", buf[:n], m)
	}

	if err := st.Delete(meta.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := st.GetMeta(meta.ID); err != aifiles.ErrNotFound {
		t.Fatalf("want not_found got %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "files", "blobs", meta.ID)); !os.IsNotExist(err) {
		t.Fatalf("blob should be gone: %v", err)
	}
}

func TestRejectUnsupportedAndEmpty(t *testing.T) {
	st, err := aifiles.NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.Save("x.exe", []byte("MZ")); err != aifiles.ErrInvalidType {
		t.Fatalf("want invalid type got %v", err)
	}
	if _, err := st.Save("empty.csv", nil); err != aifiles.ErrInvalidInput {
		t.Fatalf("want invalid input got %v", err)
	}
}

func TestRejectTooLarge(t *testing.T) {
	st, err := aifiles.NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	big := bytes.Repeat([]byte("x"), aifiles.MaxFileBytes+1)
	if _, err := st.Save("big.txt", big); err != aifiles.ErrTooLarge {
		t.Fatalf("want too large got %v", err)
	}
}

func TestKindsAndSanitize(t *testing.T) {
	st, err := aifiles.NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name string
		kind string
	}{
		{"notes.md", "text"},
		{"doc.markdown", "text"},
		{"a.PDF", "pdf"},
		{"sheet.xlsx", "excel"},
		{"old.xls", "excel"},
		{"pic.PNG", "image"},
		{"../evil/path/photo.webp", "image"},
	}
	for _, tc := range cases {
		meta, err := st.Save(tc.name, []byte("data"))
		if err != nil {
			t.Fatalf("%s: %v", tc.name, err)
		}
		if meta.Kind != tc.kind {
			t.Fatalf("%s kind=%s want %s", tc.name, meta.Kind, tc.kind)
		}
		if strings.Contains(meta.Name, "/") || strings.Contains(meta.Name, "..") {
			t.Fatalf("name not sanitized: %q", meta.Name)
		}
	}
	list, err := st.List()
	if err != nil || len(list) != len(cases) {
		t.Fatalf("list len=%d err=%v", len(list), err)
	}
	// newest first
	if list[0].CreatedAt < list[len(list)-1].CreatedAt {
		t.Fatalf("list not newest-first")
	}
}
