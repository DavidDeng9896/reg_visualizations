# AI FAB + 可拖吸附对话窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development.

**Goal:** 右下角 FAB 为唯一 AI 入口；对话窗可拖/右缘吸附；Skills/MCP/记忆并入 AI 设置；去掉 Header sparkle 与侧栏能力入口。

**Architecture:** `AiFab` + 演进 `AiDrawer`（docked/floating + localStorage）；`AiSettingsModal` 多 Tab；`CapabilitiesPanel` 改为可嵌入内容组件。

**Tech Stack:** Vue 3, Pinia, localStorage, Vitest

## Global Constraints

- 唯一入口 FAB；无 Header sparkle；无侧栏能力按钮
- 设置 Tab：模型 | Skills | MCP | 记忆（保留现有记忆能力）
- 停靠默认；拖出悬浮；右缘 ≤24px 吸附；无全屏遮罩
- `insight.ai.panel.v1` 持久化；测试 id：`ai-fab`（替代 `ai-entry`）

---

### Task 1: panelLayout 工具 + 单测

- Create: `src/modules/ai/panelLayout.ts`, `tests/unit/ai/panelLayout.spec.ts`

### Task 2: AiFab + AiDrawer dock/float

- Create: `AiFab.vue`
- Modify: `AiDrawer.vue`, `App.vue`, `AppHeader.vue`

### Task 3: 设置多 Tab + 去掉侧栏能力

- Modify: `AiSettingsModal.vue`, `CapabilitiesPanel.vue`（可嵌入）, `ShellSidebar.vue`
- Update e2e `ai-entry` → `ai-fab`

### Task 4: 验证与 PR

- typecheck / unit / 实机 FAB 拖动；commit push；update PR
