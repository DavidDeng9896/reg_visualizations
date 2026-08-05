package memory

import (
	"strings"
	"testing"
)

func TestStoreCRUD(t *testing.T) {
	st, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	a, err := st.Create("先聚合再柱状图")
	if err != nil {
		t.Fatal(err)
	}
	b, err := st.Create("散点不要用类别轴")
	if err != nil {
		t.Fatal(err)
	}
	list, err := st.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].ID != b.ID || list[1].ID != a.ID {
		t.Fatalf("newest-first want [%s,%s] got %+v", b.ID, a.ID, list)
	}
	if err := st.Delete(a.ID); err != nil {
		t.Fatal(err)
	}
	list, _ = st.List()
	if len(list) != 1 || list[0].ID != b.ID {
		t.Fatalf("after delete: %+v", list)
	}
	if err := st.Delete("missing"); err != ErrNotFound {
		t.Fatalf("want not_found got %v", err)
	}
}

func TestStoreValidation(t *testing.T) {
	st, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.Create("  "); err != ErrBadInput {
		t.Fatalf("empty: %v", err)
	}
	long := strings.Repeat("字", maxContentRunes+1)
	if _, err := st.Create(long); err != ErrBadInput {
		t.Fatalf("too long: %v", err)
	}
}
