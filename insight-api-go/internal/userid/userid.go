package userid

import (
	"net/http"
	"strings"
)

const (
	HeaderName  = "X-User-Id"
	DefaultUser = "david"
)

// Allowed mock / future-mapped user ids (lowercase slugs).
var Allowed = map[string]struct{}{
	"david":       {},
	"dengxiaowei": {},
}

// Resolve normalizes a raw user id. Empty or unknown → DefaultUser.
func Resolve(raw string) string {
	id := strings.ToLower(strings.TrimSpace(raw))
	if id == "" {
		return DefaultUser
	}
	if _, ok := Allowed[id]; !ok {
		return DefaultUser
	}
	return id
}

// FromRequest reads X-User-Id and resolves it.
func FromRequest(r *http.Request) string {
	if r == nil {
		return DefaultUser
	}
	return Resolve(r.Header.Get(HeaderName))
}

// All returns the whitelist in stable order.
func All() []string {
	return []string{"david", "dengxiaowei"}
}
