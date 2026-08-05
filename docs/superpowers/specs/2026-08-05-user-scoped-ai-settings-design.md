# 用户层隔离：Skills / MCP / 会话设计说明

**日期：** 2026-08-05  
**状态：** 设计已确认，待实现  
**范围：** insight-studio Header 模拟用户切换；insight-api-go 按用户隔离 Skills / MCP / 会话存储  
**前置：** `2026-08-04-ai-skills-mcp-design.md`（一期曾约定「全局/本机」；本规格将其升级为按用户隔离）

---

## 1. 问题与目标

### 用户要什么

1. **Skills & MCP 设置关联到用户层**：不同用户可有不同的 Skill 开关/导入与 MCP 连接配置。
2. **会话（含 ask_user、长对话压缩）关联到用户层**：会话历史按用户隔离；ask_user 与上下文压缩仍存在于会话 `messages` 内，随会话自然隔离。
3. **为后续整合真实用户体系做准备**：当前无完整账号系统，但存储与 API 须带稳定 `userId` 维度。
4. **Header 模拟双用户**：默认 `David`，可选 `dengxiaowei`，用于测试切换后设置与会话互不串扰。

### 非目标

- 真实登录 / SSO / 权限系统（仅模拟身份）
- AI 模型配置（API Key / baseUrl / model / maxIterations）按用户隔离 — **仍本机全局共享**
- 分析项目 / 图表 / 看板数据按用户隔离 — **仍共享**（现有 `workspace_id` 默认值不变）
- 用户数量可配置的后台管理；本期硬编码两个模拟用户

---

## 2. 产品决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| 隔离范围 | Skills（完整拷贝）+ MCP + 会话历史 |
| 不隔离 | AI config、分析/看板数据 |
| 官方 Skills | **每个用户完整拷贝**一份（含 official 包 + 开关 + 自导入） |
| 旧数据迁移 | 挂到默认用户 `david`；`dengxiaowei` 官方 seed + 空 MCP + 无会话 |
| 身份来源 | Header 下拉模拟；请求头 `X-User-Id` |
| 缺省用户 | 无头 / 非法 id → 后端回落 `david` |
| ask_user / 压缩 | 不另建表；随会话 `messages` 按用户隔离 |
| UI 位置 | 现有 `AppHeader` 右上角用户芯片（原硬编码 `David`）改为可切换 |

实现路径：**方案 1** — 按用户分目录（Skills/MCP）+ 会话表增加 `user_id` + `X-User-Id`。

---

## 3. 身份约定

### 3.1 模拟用户白名单

| userId（稳定 slug） | 显示名 | 角色 |
| --- | --- | --- |
| `david` | `David` | 默认；承接迁移后的旧数据 |
| `dengxiaowei` | `dengxiaowei` | 干净环境；官方 Skills seed |

后续接外部产品时：外部账号映射到同名或新的 `userId`；白名单可改为配置/JWT claim，API 契约保持 `X-User-Id`（或网关注入）。

### 3.2 前端

- Pinia（或轻量 store）维护 `currentUser: { id, displayName }`
- 持久化：`localStorage['insight.currentUserId']`，缺省 `david`
- 所有 **Skills / MCP / conversations** 请求附带：
  ```http
  X-User-Id: david
  ```
- AI config、分析/看板、chat 代理请求**不要求**该头（chat 不落库；落库靠 conversations）

### 3.3 后端

- Skills / MCP / conversations 处理器读取 `X-User-Id`
- 规范化：trim + lower；不在白名单 → `david`
- Store 路径与 SQL 过滤一律使用解析后的 `userId`

### 3.4 切换行为

1. 用户在 Header 下拉选择另一用户
2. 更新 `currentUser` + localStorage
3. 若 AI agent 运行中：abort，settle 进行中的 `ask_user`（取消文案）
4. `aiStore`：清空当前会话视图，重新 `loadConversations()`
5. 能力面板若已打开：按新用户重新拉取 Skills / MCP 列表

---

## 4. 存储布局

### 4.1 文件系统

```text
data/
  ai-config.json                 # 全局（不变）
  insight.sqlite                 # 含 ai_conversations.user_id
  users/
    .migrated-v1                 # 一次性迁移标记
    david/
      skills-state.json
      mcp-servers.json
      skills/
        official/<id>/...
        user/<id>/...
    dengxiaowei/
      skills-state.json
      mcp-servers.json
      skills/
        official/<id>/...
        user/<id>/...
```

- Skills Store / MCP Store 根目录改为：`{dataDir}/users/{userId}/`
- 官方 seed 源仍来自仓库 `skills/official`（`INSIGHT_SKILLS_SEED`）；**每个用户**首次确保时拷贝到自己的 `skills/official/`

### 4.2 SQLite：`ai_conversations`

新增列：

```sql
user_id TEXT NOT NULL DEFAULT 'david'
```

- 索引：`CREATE INDEX IF NOT EXISTS idx_ai_conv_user_updated ON ai_conversations(user_id, updated_at DESC);`
- `LIST`：`WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`
- `GET` / `PUT` / `DELETE`：匹配 `id` **且** `user_id`；跨用户 → 404
- `POST` 创建：强制写入当前请求的 `userId`

`messages` JSON 内继续承载 ask_user trace、`context-summary` 等；无需 schema 变更。

### 4.3 一次性迁移

启动时若无 `data/users/.migrated-v1`：

1. 创建 `users/david/`、`users/dengxiaowei/`
2. 若存在旧路径则迁入 `david`：
   - `data/skills/` → `users/david/skills/`
   - `data/skills-state.json` → `users/david/skills-state.json`
   - `data/mcp-servers.json` → `users/david/mcp-servers.json`
3. 对两用户：若缺 official skills，执行官方 seed
4. `UPDATE ai_conversations SET user_id = 'david' WHERE user_id IS NULL OR user_id = ''`（及列新增后的默认回填）
5. 写入 `.migrated-v1`

幂等：标记存在则跳过搬迁；seed 自身应可重复（已存在 official 包不覆盖用户改动，或按现有 `SeedOfficial` 语义）。

---

## 5. API 与前端改动面

### 5.1 Go（insight-api-go）

| 区域 | 改动 |
| --- | --- |
| `internal/skills` | Store 按 `userId` 根路径；API 从请求取用户 |
| `internal/mcp` | 同上 |
| `internal/api/ai.go` conversations | CRUD 带 `user_id` |
| `internal/store` migrate | 加列 + 索引 |
| `cmd/server` 或 api 启动 | 跑用户目录迁移 + 双用户 seed |
| AI config / chat / 分析 API | **不改契约** |

辅助：`ResolveUserID(r *http.Request) string`、白名单常量。

### 5.2 前端（insight-studio）

| 区域 | 改动 |
| --- | --- |
| 新 `currentUser` store（或 shell store） | id / displayName / setUser / 持久化 |
| `AppHeader.vue` | 下拉切换两用户（非 toast placeholder） |
| `modules/ai/client.ts` | Skills/MCP/conv 附加 `X-User-Id` |
| `aiStore.ts` | `setUser` / 切换时 abort + reload conversations |
| `CapabilitiesPanel.vue` | 依赖请求头；打开或用户变化时 reload |

### 5.3 兼容

- 旧客户端不传头 → 全部落在 `david`（与迁移后数据一致）
- Node `insight-api`：若仍用于对照测试，本期可同步最小 `user_id` 行为，或文档标明「以 Go 为准」；**实现优先 Go + studio**

---

## 6. 测试计划

1. **迁移**：有旧全局 Skills/MCP/会话 → 启动后仅 `david` 可见；标记文件存在；二次启动不重复搬迁。
2. **隔离**：`david` 导入 Skill / 配 MCP / 建会话后，切换到 `dengxiaowei` 列表为空（或仅 official seed），互不可见。
3. **Header**：默认显示 David；切换 dengxiaowei 后名称与数据刷新。
4. **会话内**：ask_user 进行中切换用户 → 请求被取消，不污染另一用户会话。
5. **AI config**：两用户改同一 Key 仍共享（回归：配置页读写不依赖 `X-User-Id`）。
6. **分析数据**：切换用户后同一套分析/看板仍可见。

单测建议：Go `ResolveUserID`、conversations 按 user 过滤、迁移函数；前端 client header 与 store 切换逻辑。

---

## 7. 风险与后续

| 风险 | 缓解 |
| --- | --- |
| 官方 Skills 多用户磁盘重复 | 两用户可接受；日后可改为内容寻址共享 + 每用户 state |
| 白名单写死 | 文档标明整合点：换 claim / 配置即可 |
| 前端仅 localStorage 记用户 | 整合后改为 SSO，去掉模拟下拉或仅开发态保留 |

**后续整合真实用户时：** 保留 `X-User-Id`（或等价 claim）与 `users/<id>/`、`ai_conversations.user_id`；替换 Header 模拟器与白名单即可。

---

## 8. 验收标准

- [ ] Header 可在 `David` / `dengxiaowei` 间切换，刷新后保持
- [ ] Skills、MCP、会话按用户隔离；AI config 与分析数据共享
- [ ] 旧本机数据出现在 `david`；`dengxiaowei` 有官方 Skills、无旧 MCP/会话
- [ ] 请求经 `X-User-Id` 驱动存储；缺省回落 `david`
- [ ] ask_user / 上下文压缩随会话隔离，切换用户不串状态
