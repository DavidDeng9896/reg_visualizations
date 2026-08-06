# AI Skills 与 MCP 支持设计说明

**日期：** 2026-08-04  
**状态：** 一期实现中（分支 `cursor/ai-skills-mcp-impl-a1e4`）  
**范围：** insight-studio 前端能力管理 + 对话装配；insight-api-go 后端存储与 MCP 代调（一期）

---

## 1. 问题与目标

### 用户要什么

1. **Skill（可插拔能力包）**：本地导入官方/用户包，可开关；一期以说明书为主，教 AI 如何用好现有平台工具。
2. **MCP（Model Context Protocol）**：连接远程 SSE/HTTP MCP Server，把外部 tools 接到 AI 助手。
3. Skill 与 MCP **并列管理**，对话时两边能力都可用。

### 非目标（一期明确不做）

- Skill 包内自定义可执行插件（JS / Python / WASM 沙箱）
- stdio 本地进程 MCP
- OAuth 鉴权
- 按 Analysis / 按账号隔离能力配置
- 远程 Skill 市场 / URL 安装

---

## 2. 产品决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| Skill 形态 | 可插拔能力包；一期仅 `skill.json` + `SKILL.md` |
| Skill 来源 | 官方包可开关 + 本地目录/zip 导入 |
| MCP 与 Skill | **并列**：分开管理，AI 两边都能用 |
| MCP 传输（一期） | 仅 **SSE/HTTP** 远程 |
| MCP 鉴权（一期） | 自定义 **Headers** 键值对 |
| 管理范围 | **全局/本机**，所有分析共用 |
| 执行位置 | **Go 后端**（`insight-api-go`）代连 MCP、代调 tools |
| 对话使用 Skill | **按需**：先注入目录摘要，模型用 `read_skill` 读全文 |
| 管理 UI | 二级侧栏搜索行「+」旁 **「能力」** 入口（抽屉/面板，Skills / MCP 两 Tab） |

实现路径：**方案 1**（侧栏「能力」双列表 + Go 能力注册表 + 前端 agent 动态装配工具）。

---

## 3. 总体架构

```text
浏览器 (insight-studio)
  ├─ 侧栏「能力」面板：Skills / MCP 管理
  ├─ AI 对话 agentLoop：
  │     内置平台工具
  │   + list_skills / read_skill
  │   + 已启用 MCP tools（动态）
  └─ MCP tool 调用 → POST /api/ai/mcp/tools/call

Go (insight-api-go)
  ├─ Skill 存储/API
  ├─ MCP 连接存储 / 探测 / 代调
  └─ 现有：/api/ai/config、/api/ai/chat、conversations
```

**现状对齐：** 当前 AI 为前端 ReAct（`agentLoop` + 静态 `TOOL_DEFS`）；后端只做配置、SSE 代理、会话。本期在此基础上增加能力注册与动态工具合并，不把 agent 主循环搬到后端。

---

## 4. 数据模型与存储

### 4.1 Skill 包格式（一期）

```text
my-skill/
  skill.json          # id, name, version, description, tags[]
  SKILL.md            # 完整说明书
```

- 导入支持 **zip**（一期 UI 以 zip 为主；目录导入可作为后续增强）
- zip 根目录（或唯一顶层文件夹内）须同时存在 `skill.json` 与 `SKILL.md`（文件名大小写不敏感，落盘规范化）
- 亦支持直接导入单个 `.md`：用 frontmatter（`id`/`name`/`description`/`version`/`tags`）或文件名 slug 生成 `skill.json`
- 官方示例包随 Go 服务内置目录分发（如 `chart-best-practices`）

`skill.json` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 稳定标识，全局唯一 |
| `name` | string | 显示名 |
| `version` | string | 语义化版本 |
| `description` | string | 短描述（进目录摘要） |
| `tags` | string[] | 可选 |

### 4.2 本机路径

```text
{dataDir}/skills/
  official/<skill-id>/...
  user/<skill-id>/...
{dataDir}/skills-state.json
{dataDir}/mcp-servers.json
```

`dataDir` 与现有 insight-api-go 数据目录一致（可由 `INSIGHT_DB_PATH` 所在目录推导，或独立 `INSIGHT_DATA_DIR`；实现时与现有约定统一）。

`skills-state.json` 示例：

```json
{
  "chart-best-practices": { "enabled": true },
  "my-imported-skill": { "enabled": false }
}
```

`mcp-servers.json` 条目示例：

```json
{
  "id": "uuid",
  "name": "My MCP",
  "url": "https://mcp.example.com/sse",
  "headers": [{ "key": "Authorization", "value": "Bearer xxx" }],
  "enabled": true,
  "lastRefreshAt": "2026-08-04T00:00:00.000Z",
  "lastError": "",
  "cachedTools": []
}
```

列表 API **不返回**完整 header value（可返回 `headersConfigured: true` 或末四位掩码）；写入时允许整表覆盖更新。

---

## 5. Go API（一期）

### 5.1 Skills

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/ai/skills` | 列表（含 `enabled`、`description`、`source`: official\|user） |
| GET | `/api/ai/skills/:id` | 详情 + 完整 `SKILL.md` 正文 |
| POST | `/api/ai/skills/import` | `multipart/form-data` 上传 zip |
| PATCH | `/api/ai/skills/:id` | `{ "enabled": boolean }` |
| DELETE | `/api/ai/skills/:id` | 仅用户包；官方包 403 或提供 restore |

### 5.2 MCP

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/ai/mcp/servers` | 连接列表（密钥掩码） |
| POST | `/api/ai/mcp/servers` | 新增：name、url、headers |
| PATCH | `/api/ai/mcp/servers/:id` | 改名 / url / headers / enabled |
| DELETE | `/api/ai/mcp/servers/:id` | 删除 |
| POST | `/api/ai/mcp/servers/:id/refresh` | 探测并缓存 tools |
| GET | `/api/ai/mcp/tools` | 所有**已启用** server 的 tools 汇总（OpenAI function 友好结构） |
| POST | `/api/ai/mcp/tools/call` | 代调：`{ serverId, name, arguments }` |

MCP 客户端实现遵循 MCP 远程传输约定（SSE/HTTP）；具体 SDK 选型在实现计划中确定（优先成熟 Go MCP client，或最小可行 HTTP/SSE 握手）。

---

## 6. 前端 UI 与对话装配

### 6.1 入口

- 位置：`ShellSidebar` 分析详情模式下，搜索行右侧 **Add data「+」旁** 增加 **「能力」** 按钮
- 面板：抽屉或锚定 Popover（宽约 360–420px），Tab：**Skills** | **MCP**

### 6.2 Skills Tab

- 列表：名称、版本、来源、描述摘要、启用开关
- 操作：导入 zip、删除用户包、预览 `SKILL.md`
- 导入走 `POST /api/ai/skills/import`

### 6.3 MCP Tab

- 列表：名称、URL、启用、tools 数量、上次刷新状态/错误
- 表单：名称、URL、Headers 键值对
- 操作：刷新 tools、删除

### 6.4 对话装配

每轮发给模型的 `tools` =

1. 现有内置平台工具（`TOOL_DEFS`）
2. 新增内置：`list_skills`、`read_skill`（前端 exec → 调 Go Skills API）
3. `GET /api/ai/mcp/tools` 转换后的 MCP tools

系统提示追加：

- 已启用 Skill 的目录摘要（id / name / description）
- 需要细节时调用 `read_skill`
- 已启用 MCP tools 可直接按名称调用

MCP tool 被模型调用时：`exec` 转发 `POST /api/ai/mcp/tools/call`。

### 6.5 官方示例 Skill

至少 1 个，例如 `chart-best-practices`：只含说明书，指导用现有图表相关工具做常见配置。

---

## 7. 安全与边界

### 安全

- Headers / 密钥仅存 Go 本机；列表不回传明文
- Skill 一期不执行包内脚本
- zip：大小上限；拒绝路径穿越；仅允许文本类文件（`skill.json`、`SKILL.md`、可选 `*.md`）
- `tools/call`：仅已启用且已在缓存登记的 tool；超时与错误摘要化；日志不落密钥

### 边界

| 情况 | 行为 |
| --- | --- |
| Skill id 冲突 | 拒绝导入 |
| MCP 刷新失败 | 保留上次成功 `cachedTools`，标记 `lastError` |
| MCP 停用 | 从对话工具列表立即移除 |
| 无已启用 Skill | 不注入目录；`list_skills`/`read_skill` 可用但为空 |
| 官方包删除 | 禁止或提供恢复 |

---

## 8. 验收标准（一期）

1. 侧栏「能力」可导入 zip Skill，可开关、可预览 `SKILL.md`
2. 可新增 SSE/HTTP MCP（URL + Headers），可刷新 tools、可开关
3. 新对话可见 Skill 目录摘要，并能 `read_skill` 读到全文
4. 模型可调用已启用 MCP tool（经 Go 代发）
5. 现有内置平台工具行为不变
6. 单测覆盖：Skill 包解析、MCP 配置存取、工具列表合并；浏览器脚本覆盖能力面板主路径

---

## 9. 建议落地顺序

1. Go：Skill 存储与 API  
2. Go：MCP 连接、刷新、代调  
3. 前端：侧栏「能力」面板  
4. 前端：agent 装配 `list_skills` / `read_skill` + MCP tools  
5. 官方示例 Skill + 验收脚本  

---

## 10. 关键文件（实现时）

| 区域 | 路径 |
| --- | --- |
| Go AI 现有 | `insight-api-go/internal/api/ai.go`、`server.go` |
| Go 新增 | Skill/MCP 模块（建议独立文件，避免 `ai.go` 膨胀） |
| 前端 AI | `insight-studio/src/modules/ai/*`（`agentLoop.ts`、`tools/registry.ts`、`tools/impl.ts`、`aiStore.ts`、`client.ts`） |
| 侧栏 | `insight-studio/src/modules/shell/ShellSidebar.vue` + 新「能力」面板组件 |
| 文档 | `insight-studio/DESIGN.md` §9 AI 章节同步 |

---

## 11. 规格自检

- [x] 无未决 TBD/占位符阻塞一期范围  
- [x] 与已确认产品决策一致（并列、Go 执行、侧栏入口、按需 Skill、Headers）  
- [x] 一期边界与非目标写明  
- [x] 验收可测  
- [x] 未混入无关重构  

**待用户审阅本文件后**，再进入 `writing-plans` 编写实现计划。
