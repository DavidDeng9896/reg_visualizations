# AI 对话 UI 优化 Implementation Plan

> **For agentic workers:** Use executing-plans / implement task-by-task.

**Goal:** Cursor 风 Markdown；MCP 可编辑；用户 Skill 可改 SKILL.md；@ 分图标。

**Architecture:** 增强 `renderMd` 段合并 + CSS；CapabilitiesPanel MCP 编辑态；Go `UpdateBody` + PATCH；AiInputBar 图标映射。

**Tech Stack:** Vue 3, Go, Vitest

## Global Constraints

- Markdown 轻量增强，Cursor 简洁样式；官方 Skill 只读
- MCP 用已有 PATCH；Skill PATCH 增 `body`
- @：analysis→database，table→table，view→VIEW_ICON

---

### Task 1: Markdown + CSS
- Modify: `AiMessageList.vue`（段合并、标题标签、样式）
- Test: unit for renderMd if extracted, or visual

### Task 2: MCP edit + Skill body API/UI
- Go: `Store.UpdateBody`, patchSkill
- FE: client + CapabilitiesPanel

### Task 3: @ mention icons
- Shared `viewIcons.ts` + AiInputBar

### Task 4: Verify, commit, PR
