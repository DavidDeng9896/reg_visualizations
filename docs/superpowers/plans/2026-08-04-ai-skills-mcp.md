# AI Skills + MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一期为 Insight AI 增加并列的本地 Skills 与远程 SSE/HTTP MCP，经 Go 存储/代调，侧栏「能力」管理，对话按需 `read_skill` 并动态合并 MCP tools。

**Architecture:** Go（`insight-api-go`）持久化 Skill 包与 MCP 连接，并代连 MCP、代调 tools；前端侧栏「能力」面板管理配置；`agentLoop` 在现有平台工具之外装配 `list_skills`/`read_skill` 与已启用 MCP tools。

**Tech Stack:** Go 1.22+、net/http、archive/zip；Vue 3、Pinia、现有 AI `client`/`agentLoop`/`tools/*`。

## Global Constraints

- Skill 一期仅 `skill.json` + `SKILL.md`，不执行包内脚本
- MCP 一期仅 SSE/HTTP + 自定义 Headers；无 stdio、无 OAuth
- 全局本机存储；密钥不回传明文
- 管理入口：侧栏「+」旁「能力」面板（Skills | MCP）
- 对话：Skill 目录摘要 + `read_skill`；MCP tools 动态合并
- 参考规格：`docs/superpowers/specs/2026-08-04-ai-skills-mcp-design.md`

## File map

| 责任 | 路径 |
| --- | --- |
| Skill 包解析/存储 | `insight-api-go/internal/skills/` |
| MCP 配置与客户端 | `insight-api-go/internal/mcp/` |
| HTTP 路由 | `insight-api-go/internal/api/skills.go`, `mcp.go`, `server.go` |
| 官方示例 Skill | `insight-api-go/skills/official/chart-best-practices/` |
| 前端 API client | `insight-studio/src/modules/ai/client.ts` |
| 能力面板 | `insight-studio/src/modules/ai/CapabilitiesPanel.vue` |
| 侧栏入口 | `insight-studio/src/modules/shell/ShellSidebar.vue` |
| 工具注册/执行 | `insight-studio/src/modules/ai/tools/registry.ts`, `impl.ts` |
| Agent 装配 | `insight-studio/src/modules/ai/aiStore.ts`, `prompts.ts` |

---

### Task 1: Go Skill 存储与 API

**Files:**
- Create: `insight-api-go/internal/skills/store.go`, `parse.go`, `store_test.go`
- Create: `insight-api-go/internal/api/skills.go`, `skills_test.go`
- Create: `insight-api-go/skills/official/chart-best-practices/skill.json`, `SKILL.md`
- Modify: `insight-api-go/internal/api/server.go`, `cmd/server/main.go`（注入 dataDir）

**Produces:** `GET/POST/PATCH/DELETE /api/ai/skills*`

- [ ] Step 1: 写 `parse`/`List`/`ImportZip`/`SetEnabled`/`Get` 失败测试
- [ ] Step 2: 实现最小存储 + 官方目录扫描 + zip 导入（防穿越）
- [ ] Step 3: 挂路由并用 httptest 测 import/list/get/patch/delete
- [ ] Step 4: `go test ./...` 通过并 commit

### Task 2: Go MCP 连接 / 刷新 / 代调

**Files:**
- Create: `insight-api-go/internal/mcp/store.go`, `client.go`, `store_test.go`, `client_test.go`
- Create: `insight-api-go/internal/api/mcp.go`, `mcp_test.go`
- Modify: `insight-api-go/internal/api/server.go`

**Produces:** `/api/ai/mcp/servers*`, `/api/ai/mcp/tools`, `/api/ai/mcp/tools/call`

- [ ] Step 1: 写配置 CRUD + 掩码 headers 测试
- [ ] Step 2: 实现 JSON 文件存储；列表不回传明文 header value
- [ ] Step 3: 实现最小 SSE/HTTP MCP：initialize + tools/list + tools/call（用 httptest mock server）
- [ ] Step 4: 挂路由；`go test ./...`；commit

### Task 3: 前端能力面板

**Files:**
- Create: `insight-studio/src/modules/ai/CapabilitiesPanel.vue`
- Modify: `insight-studio/src/modules/ai/client.ts`
- Modify: `insight-studio/src/modules/shell/ShellSidebar.vue`

- [ ] Step 1: client 增加 skills/mcp API 方法
- [ ] Step 2: CapabilitiesPanel（双 Tab：导入/开关/预览；MCP CRUD/刷新）
- [ ] Step 3: 侧栏「能力」按钮打开面板
- [ ] Step 4: commit

### Task 4: Agent 装配 list_skills / read_skill + MCP tools

**Files:**
- Modify: `insight-studio/src/modules/ai/tools/registry.ts`, `impl.ts`
- Modify: `insight-studio/src/modules/ai/aiStore.ts`, `prompts.ts`（或 context）
- Test: `insight-studio/tests/unit/ai/*`

- [ ] Step 1: 注册 `list_skills`/`read_skill` 并实现 exec
- [ ] Step 2: 发送前拉取 MCP tools 合并进 `tools`；MCP 调用走 `/api/ai/mcp/tools/call`
- [ ] Step 3: system 提示注入已启用 Skill 目录摘要
- [ ] Step 4: 单元测试 + commit

### Task 5: 验收脚本与文档

**Files:**
- Create: `insight-studio/tests/manual/skills-mcp-panel.mts`（可选轻量）
- Modify: `insight-studio/DESIGN.md` §9
- Modify: spec 状态为可实现/已进入实现

- [ ] Step 1: 更新 DESIGN.md
- [ ] Step 2: 手动/脚本冒烟：能力面板打开、skills list、mcp list
- [ ] Step 3: push / 更新 PR
