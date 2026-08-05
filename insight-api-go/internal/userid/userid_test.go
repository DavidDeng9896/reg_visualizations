package userid

import (
	"net/http"
	"testing"
)

func TestResolve(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"", DefaultUser},
		{"  ", DefaultUser},
		{"david", "david"},
		{"David", "david"},
		{" DENGXIAOWEI ", "dengxiaowei"},
		{"unknown", DefaultUser},
		{"admin", DefaultUser},
	}
	for _, c := range cases {
		if got := Resolve(c.in); got != c.want {
			t.Fatalf("Resolve(%q)=%q want %q", c.in, got, c.want)
		}
	}
}

func TestFromRequest(t *testing.T) {
	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	if got := FromRequest(r); got != DefaultUser {
		t.Fatalf("missing header: got %q", got)
	}
	r.Header.Set(HeaderName, "dengxiaowei")
	if got := FromRequest(r); got != "dengxiaowei" {
		t.Fatalf("got %q", got)
	}
	if FromRequest(nil) != DefaultUser {
		t.Fatal("nil request")
	}
}
