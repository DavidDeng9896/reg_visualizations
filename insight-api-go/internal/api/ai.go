package api

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userid"
	"github.com/google/uuid"
)

/* AI 助手：配置（掩码）+ OpenAI 兼容 SSE 代理 + 会话 CRUD。契约对齐 Node insight-api/src/ai.ts。 */

type aiConfig struct {
	BaseURL            string   `json:"baseUrl"`
	APIKey             string   `json:"apiKey"`
	Model              string   `json:"model"`
	Models             []string `json:"models"`
	MaxIterations      int      `json:"maxIterations"`
	ConfirmDestructive bool     `json:"confirmDestructive"`
	ConfirmWrite       bool     `json:"confirmWrite"`
}

func defaultAiConfig() aiConfig {
	return aiConfig{
		BaseURL:            "https://api.openai.com/v1",
		APIKey:             "",
		Model:              "gpt-4o-mini",
		Models:             []string{},
		MaxIterations:      100,
		ConfirmDestructive: true,
		ConfirmWrite:       false,
	}
}

func maskKey(key string) string {
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return "••••••••"
	}
	return key[:4] + "…••••…" + key[len(key)-4:]
}

func (s *Server) aiConfigPath() string {
	if s.ConfigPath != "" {
		return s.ConfigPath
	}
	return filepath.Join("data", "ai-config.json")
}

func (s *Server) readAiConfig() aiConfig {
	cfg := defaultAiConfig()
	raw, err := os.ReadFile(s.aiConfigPath())
	if err != nil {
		return cfg
	}
	_ = json.Unmarshal(raw, &cfg)
	if cfg.Models == nil {
		cfg.Models = []string{}
	}
	if cfg.MaxIterations < 1 {
		cfg.MaxIterations = 100
	}
	return cfg
}

func (s *Server) writeAiConfig(next aiConfig) error {
	path := s.aiConfigPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o600)
}

func (s *Server) getAiConfig(w http.ResponseWriter, _ *http.Request) {
	cfg := s.readAiConfig()
	writeJSON(w, http.StatusOK, map[string]any{
		"baseUrl":            cfg.BaseURL,
		"apiKeyMasked":       maskKey(cfg.APIKey),
		"configured":         cfg.APIKey != "",
		"model":              cfg.Model,
		"models":             cfg.Models,
		"maxIterations":      cfg.MaxIterations,
		"confirmDestructive": cfg.ConfirmDestructive,
		"confirmWrite":       cfg.ConfirmWrite,
	})
}

func (s *Server) putAiConfig(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	dec := json.NewDecoder(r.Body)
	dec.UseNumber()
	if err := dec.Decode(&body); err != nil || body == nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	cur := s.readAiConfig()
	next := cur

	// apiKey：字段缺失 / null / 非字符串 → 保留；字符串 → 更新（空串清空）
	if v, ok := body["apiKey"]; ok {
		if s, ok := v.(string); ok {
			next.APIKey = strings.TrimSpace(s)
		}
	}
	if s, ok := body["baseUrl"].(string); ok && strings.TrimSpace(s) != "" {
		next.BaseURL = strings.TrimRight(strings.TrimSpace(s), "/")
	}
	if s, ok := body["model"].(string); ok && strings.TrimSpace(s) != "" {
		next.Model = strings.TrimSpace(s)
	}
	if arr, ok := body["models"].([]any); ok {
		seen := map[string]struct{}{}
		out := make([]string, 0, len(arr))
		for _, item := range arr {
			m, ok := item.(string)
			m = strings.TrimSpace(m)
			if !ok || m == "" {
				continue
			}
			if _, dup := seen[m]; dup {
				continue
			}
			seen[m] = struct{}{}
			out = append(out, m)
		}
		next.Models = out
	}
	if n, ok := asFiniteInt(body["maxIterations"]); ok {
		if n < 1 {
			n = 1
		}
		if n > 100 {
			n = 100
		}
		next.MaxIterations = n
	}
	if b, ok := body["confirmDestructive"].(bool); ok {
		next.ConfirmDestructive = b
	}
	if b, ok := body["confirmWrite"].(bool); ok {
		next.ConfirmWrite = b
	}

	if err := s.writeAiConfig(next); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"error":   "write_failed",
			"message": err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":           true,
		"configured":   next.APIKey != "",
		"apiKeyMasked": maskKey(next.APIKey),
	})
}

func asFiniteInt(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case json.Number:
		i, err := n.Int64()
		if err != nil {
			return 0, false
		}
		return int(i), true
	case int:
		return n, true
	case int64:
		return int(n), true
	default:
		return 0, false
	}
}

// decodeUpstreamErrorBody 解压/解析上游错误体，避免 gzip 二进制被当字符串回传。
func decodeUpstreamErrorBody(raw []byte) string {
	if len(raw) == 0 {
		return "上游模型返回错误（无详情）"
	}
	data := raw
	// 缺 Content-Encoding 时仍可能是 gzip（魔数 1f 8b）
	if len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b {
		if zr, err := gzip.NewReader(bytes.NewReader(data)); err == nil {
			out, err := io.ReadAll(io.LimitReader(zr, 8<<10))
			_ = zr.Close()
			if err == nil && len(out) > 0 {
				data = out
			}
		}
	}
	var envelope struct {
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
			Code    any    `json:"code"`
		} `json:"error"`
		Message string `json:"message"`
	}
	if json.Unmarshal(data, &envelope) == nil {
		if msg := strings.TrimSpace(envelope.Error.Message); msg != "" {
			return clipErrMsg(msg)
		}
		if msg := strings.TrimSpace(envelope.Message); msg != "" {
			return clipErrMsg(msg)
		}
	}
	s := strings.ToValidUTF8(string(data), "")
	s = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' || unicode.IsPrint(r) {
			return r
		}
		return -1
	}, s)
	s = strings.TrimSpace(s)
	if s == "" {
		return "上游模型返回错误（无法解析响应正文）"
	}
	return clipErrMsg(s)
}

func clipErrMsg(s string) string {
	const max = 400
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}

// sanitizeUpstreamMessages 规范化发往上游的 messages，降低豆包 Invalid request body：
// - assistant+tool_calls：去掉空/null content（字段省略，勿发 null）
// - 纯 text 的 content 数组压成 string
// - tool content 保证为非空字符串；剔除 reasoning 等杂字段
func sanitizeUpstreamMessages(msgs []any) []any {
	out := make([]any, 0, len(msgs))
	for _, raw := range msgs {
		m, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		next := map[string]any{}
		role, _ := m["role"].(string)
		if role == "" {
			continue
		}
		next["role"] = role
		if id, ok := m["tool_call_id"].(string); ok && id != "" {
			next["tool_call_id"] = id
		}
		if name, ok := m["name"].(string); ok && name != "" {
			next["name"] = name
		}
		if tcs, ok := m["tool_calls"].([]any); ok && len(tcs) > 0 {
			cleaned := make([]any, 0, len(tcs))
			for _, tc := range tcs {
				tcm, ok := tc.(map[string]any)
				if !ok {
					continue
				}
				fn, _ := tcm["function"].(map[string]any)
				if fn == nil {
					continue
				}
				fname, _ := fn["name"].(string)
				if fname == "" {
					continue
				}
				args, _ := fn["arguments"].(string)
				if strings.TrimSpace(args) == "" {
					args = "{}"
				}
				id, _ := tcm["id"].(string)
				if id == "" {
					id = "call_" + fname
				}
				cleaned = append(cleaned, map[string]any{
					"id":   id,
					"type": "function",
					"function": map[string]any{
						"name":      fname,
						"arguments": args,
					},
				})
			}
			if len(cleaned) > 0 {
				next["tool_calls"] = cleaned
			}
		}
		contentStr, contentRaw, flatOK := normalizeMessageContent(m["content"])
		_, hasTools := next["tool_calls"]
		if role == "tool" {
			if contentStr == "" {
				contentStr = "(空)"
			}
			next["content"] = contentStr
		} else if role == "assistant" && hasTools {
			if contentStr != "" {
				next["content"] = contentStr
			} else if !flatOK && contentRaw != nil {
				next["content"] = contentRaw
			}
			// 空 content：省略字段（勿写 null）
		} else {
			if contentStr == "" && flatOK && !hasTools {
				continue
			}
			if contentStr != "" && flatOK {
				next["content"] = contentStr
			} else if contentRaw != nil {
				next["content"] = contentRaw
			} else if !hasTools {
				continue
			}
		}
		out = append(out, next)
	}
	return out
}

// normalizeMessageContent：string 或纯 text 数组 → 字符串；多模态数组返回 raw 且 flatOK=false。
func normalizeMessageContent(v any) (flat string, raw any, flatOK bool) {
	if v == nil {
		return "", nil, true
	}
	if s, ok := v.(string); ok {
		return s, s, true
	}
	arr, ok := v.([]any)
	if !ok {
		return "", v, false
	}
	if len(arr) == 0 {
		return "", nil, true
	}
	var b strings.Builder
	for i, p := range arr {
		pm, ok := p.(map[string]any)
		if !ok {
			return "", arr, false
		}
		if t, _ := pm["type"].(string); t != "text" {
			return "", arr, false
		}
		text, _ := pm["text"].(string)
		if i > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(text)
	}
	return b.String(), arr, true
}

func (s *Server) postAiChat(w http.ResponseWriter, r *http.Request) {
	cfg := s.readAiConfig()
	if cfg.APIKey == "" {
		writeErr(w, http.StatusConflict, "ai_not_configured")
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 32<<20))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	msgs, ok := payload["messages"].([]any)
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	payload["messages"] = sanitizeUpstreamMessages(msgs)
	if _, has := payload["model"]; !has || payload["model"] == nil || payload["model"] == "" {
		payload["model"] = cfg.Model
	}
	payload["stream"] = true
	upstreamBody, err := json.Marshal(payload)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, cfg.BaseURL+"/chat/completions", bytes.NewReader(upstreamBody))
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "upstream_unreachable", "message": err.Error()})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	// SSE 代理禁用压缩，避免错误体/流被 gzip 后前端显示乱码
	req.Header.Set("Accept-Encoding", "identity")

	client := &http.Client{Timeout: 0}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "upstream_unreachable", "message": err.Error()})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 16<<10))
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"error":   "upstream_error",
			"status":  resp.StatusCode,
			"message": decodeUpstreamErrorBody(raw),
		})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher, _ := w.(http.Flusher)
	buf := make([]byte, 32*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := w.Write(buf[:n]); werr != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
		}
		if readErr != nil {
			return
		}
	}
}

type conversationDoc struct {
	ID         string `json:"id"`
	AnalysisID any    `json:"analysisId"` // string | null
	Title      string `json:"title"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
	Messages   []any  `json:"messages,omitempty"`
}

func (s *Server) listAiConversations(w http.ResponseWriter, r *http.Request) {
	uid := userid.FromRequest(r)
	rows, err := s.Store.DB.Query(
		`SELECT id, analysis_id, title, created_at, updated_at
		 FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`, uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, title, createdAt, updatedAt string
		var analysisID *string
		if err := rows.Scan(&id, &analysisID, &title, &createdAt, &updatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "internal")
			return
		}
		var aid any
		if analysisID != nil {
			aid = *analysisID
		} else {
			aid = nil
		}
		out = append(out, map[string]any{
			"id": id, "analysisId": aid, "title": title,
			"createdAt": createdAt, "updatedAt": updatedAt,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createAiConversation(w http.ResponseWriter, r *http.Request) {
	uid := userid.FromRequest(r)
	var body struct {
		AnalysisID *string `json:"analysisId"`
		Title      string  `json:"title"`
		Messages   []any   `json:"messages"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	now := time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
	if body.Title == "" {
		body.Title = "新会话"
	}
	if body.Messages == nil {
		body.Messages = []any{}
	}
	msgRaw, _ := json.Marshal(body.Messages)
	id := uuid.NewString()
	var aid any
	if body.AnalysisID != nil {
		aid = *body.AnalysisID
	}
	_, err := s.Store.DB.Exec(
		`INSERT INTO ai_conversations (id, analysis_id, title, created_at, updated_at, messages, user_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, aid, body.Title, now, now, string(msgRaw), uid,
	)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusCreated, conversationDoc{
		ID: id, AnalysisID: aid, Title: body.Title,
		CreatedAt: now, UpdatedAt: now, Messages: body.Messages,
	})
}

func (s *Server) getAiConversation(w http.ResponseWriter, r *http.Request) {
	uid := userid.FromRequest(r)
	id := r.PathValue("id")
	var title, createdAt, updatedAt, messages string
	var analysisID *string
	err := s.Store.DB.QueryRow(
		`SELECT analysis_id, title, created_at, updated_at, messages FROM ai_conversations WHERE id = ? AND user_id = ?`,
		id, uid,
	).Scan(&analysisID, &title, &createdAt, &updatedAt, &messages)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	var msgs []any
	_ = json.Unmarshal([]byte(messages), &msgs)
	if msgs == nil {
		msgs = []any{}
	}
	var aid any
	if analysisID != nil {
		aid = *analysisID
	}
	writeJSON(w, http.StatusOK, conversationDoc{
		ID: id, AnalysisID: aid, Title: title,
		CreatedAt: createdAt, UpdatedAt: updatedAt, Messages: msgs,
	})
}

func (s *Server) putAiConversation(w http.ResponseWriter, r *http.Request) {
	uid := userid.FromRequest(r)
	id := r.PathValue("id")
	var title, createdAt, updatedAt, messages string
	var analysisID *string
	err := s.Store.DB.QueryRow(
		`SELECT analysis_id, title, created_at, updated_at, messages FROM ai_conversations WHERE id = ? AND user_id = ?`,
		id, uid,
	).Scan(&analysisID, &title, &createdAt, &updatedAt, &messages)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}

	raw, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid_body")
		return
	}
	var body map[string]any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid_body")
			return
		}
	}

	var msgs []any
	_ = json.Unmarshal([]byte(messages), &msgs)
	if msgs == nil {
		msgs = []any{}
	}
	aid := any(nil)
	if analysisID != nil {
		aid = *analysisID
	}

	if body != nil {
		if t, ok := body["title"].(string); ok {
			title = t
		}
		if m, ok := body["messages"].([]any); ok {
			msgs = m
		}
		if _, ok := body["analysisId"]; ok {
			aid = body["analysisId"]
		}
	}

	updatedAt = time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
	msgRaw, _ := json.Marshal(msgs)
	_, err = s.Store.DB.Exec(
		`UPDATE ai_conversations SET title = ?, analysis_id = ?, updated_at = ?, messages = ? WHERE id = ? AND user_id = ?`,
		title, aid, updatedAt, string(msgRaw), id, uid,
	)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	writeJSON(w, http.StatusOK, conversationDoc{
		ID: id, AnalysisID: aid, Title: title,
		CreatedAt: createdAt, UpdatedAt: updatedAt, Messages: msgs,
	})
}

func (s *Server) deleteAiConversation(w http.ResponseWriter, r *http.Request) {
	uid := userid.FromRequest(r)
	id := r.PathValue("id")
	res, err := s.Store.DB.Exec(`DELETE FROM ai_conversations WHERE id = ? AND user_id = ?`, id, uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeErr(w, http.StatusNotFound, "not_found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
