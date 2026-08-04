package mcp

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound = errors.New("not_found")
	ErrBadInput = errors.New("invalid_body")
)

type HeaderKV struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type ToolDef struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
}

type ServerRecord struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	URL           string    `json:"url"`
	Headers       []HeaderKV `json:"headers"`
	Enabled       bool      `json:"enabled"`
	LastRefreshAt string    `json:"lastRefreshAt,omitempty"`
	LastError     string    `json:"lastError,omitempty"`
	CachedTools   []ToolDef `json:"cachedTools,omitempty"`
}

// PublicView masks header values.
type PublicView struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	URL                string    `json:"url"`
	Enabled            bool      `json:"enabled"`
	HeadersConfigured  bool      `json:"headersConfigured"`
	HeaderKeys         []string  `json:"headerKeys"`
	LastRefreshAt      string    `json:"lastRefreshAt,omitempty"`
	LastError          string    `json:"lastError,omitempty"`
	CachedTools        []ToolDef `json:"cachedTools,omitempty"`
	ToolCount          int       `json:"toolCount"`
}

type Store struct {
	Path   string
	Client *Client
}

func NewStore(dataDir string) (*Store, error) {
	if dataDir == "" {
		return nil, errors.New("mcp data dir required")
	}
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}
	return &Store{
		Path:   filepath.Join(dataDir, "mcp-servers.json"),
		Client: &Client{HTTP: &http.Client{Timeout: 30 * time.Second}},
	}, nil
}

func (s *Store) load() ([]ServerRecord, error) {
	raw, err := os.ReadFile(s.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return []ServerRecord{}, nil
		}
		return nil, err
	}
	var list []ServerRecord
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []ServerRecord{}
	}
	return list, nil
}

func (s *Store) save(list []ServerRecord) error {
	raw, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.Path, raw, 0o600)
}

func toPublic(r ServerRecord) PublicView {
	keys := make([]string, 0, len(r.Headers))
	for _, h := range r.Headers {
		if strings.TrimSpace(h.Key) != "" {
			keys = append(keys, h.Key)
		}
	}
	tools := r.CachedTools
	if tools == nil {
		tools = []ToolDef{}
	}
	return PublicView{
		ID:                r.ID,
		Name:              r.Name,
		URL:               r.URL,
		Enabled:           r.Enabled,
		HeadersConfigured: len(r.Headers) > 0,
		HeaderKeys:        keys,
		LastRefreshAt:     r.LastRefreshAt,
		LastError:         r.LastError,
		CachedTools:       tools,
		ToolCount:         len(tools),
	}
}

func (s *Store) List() ([]PublicView, error) {
	list, err := s.load()
	if err != nil {
		return nil, err
	}
	out := make([]PublicView, 0, len(list))
	for _, r := range list {
		out = append(out, toPublic(r))
	}
	return out, nil
}

func (s *Store) Create(name, url string, headers []HeaderKV) (PublicView, error) {
	name = strings.TrimSpace(name)
	url = strings.TrimSpace(url)
	if name == "" || url == "" {
		return PublicView{}, ErrBadInput
	}
	list, err := s.load()
	if err != nil {
		return PublicView{}, err
	}
	if headers == nil {
		headers = []HeaderKV{}
	}
	rec := ServerRecord{
		ID: uuid.NewString(), Name: name, URL: url, Headers: headers, Enabled: true, CachedTools: []ToolDef{},
	}
	list = append(list, rec)
	if err := s.save(list); err != nil {
		return PublicView{}, err
	}
	return toPublic(rec), nil
}

func (s *Store) get(id string) ([]ServerRecord, int, error) {
	list, err := s.load()
	if err != nil {
		return nil, -1, err
	}
	for i, r := range list {
		if r.ID == id {
			return list, i, nil
		}
	}
	return list, -1, ErrNotFound
}

func (s *Store) Patch(id string, name, url *string, headers *[]HeaderKV, enabled *bool) (PublicView, error) {
	list, i, err := s.get(id)
	if err != nil {
		return PublicView{}, err
	}
	r := list[i]
	if name != nil && strings.TrimSpace(*name) != "" {
		r.Name = strings.TrimSpace(*name)
	}
	if url != nil && strings.TrimSpace(*url) != "" {
		r.URL = strings.TrimSpace(*url)
	}
	if headers != nil {
		r.Headers = *headers
	}
	if enabled != nil {
		r.Enabled = *enabled
	}
	list[i] = r
	if err := s.save(list); err != nil {
		return PublicView{}, err
	}
	return toPublic(r), nil
}

func (s *Store) Delete(id string) error {
	list, i, err := s.get(id)
	if err != nil {
		return err
	}
	list = append(list[:i], list[i+1:]...)
	return s.save(list)
}

func (s *Store) Refresh(id string) (PublicView, error) {
	list, i, err := s.get(id)
	if err != nil {
		return PublicView{}, err
	}
	r := list[i]
	tools, callErr := s.Client.ListTools(r.URL, r.Headers)
	now := time.Now().UTC().Format(time.RFC3339Nano)
	r.LastRefreshAt = now
	if callErr != nil {
		r.LastError = callErr.Error()
		// keep previous tools
	} else {
		r.LastError = ""
		r.CachedTools = tools
	}
	list[i] = r
	if err := s.save(list); err != nil {
		return PublicView{}, err
	}
	if callErr != nil {
		return toPublic(r), callErr
	}
	return toPublic(r), nil
}

type EnabledTool struct {
	ServerID   string         `json:"serverId"`
	ServerName string         `json:"serverName"`
	Name       string         `json:"name"`
	Description string        `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
}

func (s *Store) EnabledTools() ([]EnabledTool, error) {
	list, err := s.load()
	if err != nil {
		return nil, err
	}
	out := make([]EnabledTool, 0)
	for _, r := range list {
		if !r.Enabled {
			continue
		}
		for _, t := range r.CachedTools {
			out = append(out, EnabledTool{
				ServerID: r.ID, ServerName: r.Name,
				Name: t.Name, Description: t.Description, InputSchema: t.InputSchema,
			})
		}
	}
	return out, nil
}

func (s *Store) Call(serverID, name string, args map[string]any) (any, error) {
	list, i, err := s.get(serverID)
	if err != nil {
		return nil, err
	}
	r := list[i]
	if !r.Enabled {
		return nil, fmt.Errorf("server_disabled")
	}
	found := false
	for _, t := range r.CachedTools {
		if t.Name == name {
			found = true
			break
		}
	}
	if !found {
		return nil, fmt.Errorf("tool_not_registered")
	}
	return s.Client.CallTool(r.URL, r.Headers, name, args)
}

/* ---------------- MCP HTTP/JSON-RPC (minimal SSE/HTTP) ---------------- */

type Client struct {
	HTTP *http.Client
}

type rpcReq struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

type rpcResp struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func (c *Client) post(url string, headers []HeaderKV, method string, params any) (json.RawMessage, error) {
	body, _ := json.Marshal(rpcReq{JSONRPC: "2.0", ID: 1, Method: method, Params: params})
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	for _, h := range headers {
		if strings.TrimSpace(h.Key) != "" {
			req.Header.Set(h.Key, h.Value)
		}
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("http_%d: %s", res.StatusCode, truncate(string(raw), 200))
	}
	payload := raw
	// naive SSE: take last data: line that looks like JSON
	if bytes.Contains(raw, []byte("data:")) {
		lines := bytes.Split(raw, []byte("\n"))
		for i := len(lines) - 1; i >= 0; i-- {
			line := bytes.TrimSpace(lines[i])
			if bytes.HasPrefix(line, []byte("data:")) {
				payload = bytes.TrimSpace(bytes.TrimPrefix(line, []byte("data:")))
				break
			}
		}
	}
	var resp rpcResp
	if err := json.Unmarshal(payload, &resp); err != nil {
		return nil, fmt.Errorf("bad_rpc_response: %w", err)
	}
	if resp.Error != nil {
		return nil, fmt.Errorf("rpc_%d: %s", resp.Error.Code, resp.Error.Message)
	}
	return resp.Result, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func (c *Client) ListTools(url string, headers []HeaderKV) ([]ToolDef, error) {
	// initialize (best-effort)
	_, _ = c.post(url, headers, "initialize", map[string]any{
		"protocolVersion": "2024-11-05",
		"capabilities":    map[string]any{},
		"clientInfo":      map[string]any{"name": "insight-api-go", "version": "0.1.0"},
	})
	_, _ = c.post(url, headers, "notifications/initialized", map[string]any{})

	result, err := c.post(url, headers, "tools/list", map[string]any{})
	if err != nil {
		return nil, err
	}
	var wrap struct {
		Tools []struct {
			Name        string         `json:"name"`
			Description string         `json:"description"`
			InputSchema map[string]any `json:"inputSchema"`
		} `json:"tools"`
	}
	if err := json.Unmarshal(result, &wrap); err != nil {
		return nil, err
	}
	out := make([]ToolDef, 0, len(wrap.Tools))
	for _, t := range wrap.Tools {
		out = append(out, ToolDef{Name: t.Name, Description: t.Description, InputSchema: t.InputSchema})
	}
	return out, nil
}

func (c *Client) CallTool(url string, headers []HeaderKV, name string, args map[string]any) (any, error) {
	if args == nil {
		args = map[string]any{}
	}
	result, err := c.post(url, headers, "tools/call", map[string]any{
		"name":      name,
		"arguments": args,
	})
	if err != nil {
		return nil, err
	}
	var v any
	_ = json.Unmarshal(result, &v)
	return v, nil
}
