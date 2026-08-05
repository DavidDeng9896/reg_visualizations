# AI 分析记忆（MVP）

## 目标

用户纠正过的错误分析思路可沉淀为记忆，下次对话自动注入系统提示，避免重复旧做法。

## 方案

- 按 `X-User-Id` 隔离，文件：`data/users/<uid>/ai-memories.json`
- CRUD：`GET/POST /api/ai/memories`，`DELETE /api/ai/memories/{id}`
- 捕获：能力面板「记忆」页手动添加；工具 `save_memory({ content })`
- 注入：`aiStore.send()` 在 `SYSTEM_PROMPT` 后插入「用户分析记忆」块（始终注入，非按需）

## 非目标（MVP 外）

自动从聊天挖掘纠正、向量检索、按分析隔离、编辑记忆。
