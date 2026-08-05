# 用户层隔离 Skills/MCP/会话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户隔离 Skills、MCP、会话；Header 模拟 David / dengxiaowei；AI config 与分析数据仍共享。

**Architecture:** Go 侧 `data/users/<userId>/` 存 Skills+MCP；`ai_conversations.user_id` 过滤会话；请求头 `X-User-Id`。前端 `currentUser` store + Header 下拉；Skills/MCP/conv API 附带头。

**Tech Stack:** Go (insight-api-go)、Vue 3 + Pinia (insight-studio)、SQLite

## Global Constraints

- 隔离：Skills（每用户完整拷贝）+ MCP + 会话；不隔离 AI config、分析/看板
- 用户：`david`（默认）、`dengxiaowei`；非法/缺省 → `david`
- 旧数据迁到 `david`；`dengxiaowei` 官方 seed
- ask_user / 压缩随会话 messages，不另表
- 请求头：`X-User-Id`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `insight-api-go/internal/userid/userid.go` | ResolveUserID、白名单、DefaultUser |
| `insight-api-go/internal/userscope/migrate.go` | 一次性迁移 + 确保用户目录 seed |
| `insight-api-go/internal/api/userstores.go` | 按 userId 解析 Skills/MCP Store |
| Modify: skills/mcp handlers、ai conversations、store migrate、server CORS、main.go | 接线 |
| `insight-studio/src/modules/shell/currentUser.ts` | 模拟用户 store |
| Modify: AppHeader、client.ts、aiStore、CapabilitiesPanel | 切换与带头 |

---

### Task 1: Go userid + userscope migrate

**Files:**
- Create: `insight-api-go/internal/userid/userid.go`
- Create: `insight-api-go/internal/userid/userid_test.go`
- Create: `insight-api-go/internal/userscope/migrate.go`
- Create: `insight-api-go/internal/userscope/migrate_test.go`

- [ ] **Step 1:** 实现 `Resolve(raw string) string`、`FromRequest(r)`，白名单 `david|dengxiaowei`，默认 `david`
- [ ] **Step 2:** 实现 `Migrate(dataDir, seedDir string)`：写 `.migrated-v1`、搬旧路径到 david、双用户 SeedOfficial
- [ ] **Step 3:** `go test ./internal/userid/ ./internal/userscope/`
- [ ] **Step 4:** Commit

### Task 2: Conversations user_id + Skills/MCP per-user stores

**Files:**
- Modify: `internal/store/store.go` migrate（ADD COLUMN + index）
- Modify: `internal/api/ai.go` conversations CRUD
- Modify: `internal/api/server.go`（DataDir、SkillsSeed、CORS Allow-Headers）
- Modify: `internal/api/skills.go`、`mcp.go` 用 per-request store
- Modify: `cmd/server/main.go`
- Test: conversations isolation + handler smoke

- [ ] **Step 1:** SQLite 加 `user_id`，CRUD 过滤
- [ ] **Step 2:** Server 按 `X-User-Id` 打开 `users/<id>/` 的 Skills/MCP store
- [ ] **Step 3:** main 调用 Migrate；CORS 允许 `X-User-Id`
- [ ] **Step 4:** `go test ./...`
- [ ] **Step 5:** Commit

### Task 3: Frontend currentUser + Header + client headers

**Files:**
- Create: `insight-studio/src/modules/shell/currentUser.ts`
- Modify: `AppHeader.vue`、`client.ts`、`aiStore.ts`、`CapabilitiesPanel.vue`
- Test: unit for currentUser + optional Playwright smoke

- [ ] **Step 1:** currentUser store + localStorage
- [ ] **Step 2:** client 对 Skills/MCP/conv 附加 `X-User-Id`（含 FormData import）
- [ ] **Step 3:** Header 下拉；切换时 abort agent + reload conversations + 能力面板 reload
- [ ] **Step 4:** 前端单测 / 构建
- [ ] **Step 5:** Commit

### Task 4: 端到端自测

- [ ] 起 Go API，用 curl 验证两用户 Skills/MCP/会话隔离与迁移
- [ ] 起前端（如可行）验证 Header 切换
- [ ] 修问题、更新 PR

---
