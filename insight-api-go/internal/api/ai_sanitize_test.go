package api

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSanitizeUpstreamMessages_omitNullContent(t *testing.T) {
	in := []any{
		map[string]any{"role": "user", "content": "hi"},
		map[string]any{
			"role":    "assistant",
			"content": nil,
			"tool_calls": []any{
				map[string]any{
					"id":   "c1",
					"type": "function",
					"function": map[string]any{
						"name":      "submit_plan",
						"arguments": `{"steps":["a"]}`,
					},
				},
			},
		},
		map[string]any{"role": "tool", "tool_call_id": "c1", "name": "submit_plan", "content": "ok"},
	}
	out := sanitizeUpstreamMessages(in)
	if len(out) != 3 {
		t.Fatalf("len=%d", len(out))
	}
	asst := out[1].(map[string]any)
	if _, has := asst["content"]; has {
		t.Fatalf("assistant content should be omitted, got %#v", asst["content"])
	}
	raw, _ := json.Marshal(asst)
	if strings.Contains(string(raw), `"content"`) {
		t.Fatalf("json still has content: %s", raw)
	}
}

func TestSanitizeUpstreamMessages_flattenTextArray(t *testing.T) {
	in := []any{
		map[string]any{
			"role": "user",
			"content": []any{
				map[string]any{"type": "text", "text": "hello"},
				map[string]any{"type": "text", "text": "world"},
			},
		},
	}
	out := sanitizeUpstreamMessages(in)
	u := out[0].(map[string]any)
	if u["content"] != "hello\nworld" {
		t.Fatalf("content=%v", u["content"])
	}
}
