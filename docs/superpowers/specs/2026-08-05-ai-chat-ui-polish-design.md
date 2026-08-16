# AI 对话 UI 优化设计说明（Markdown / MCP 编辑 / Skill 正文 / @ 图标）

**日期：** 2026-08-05  
**状态：** 已实现  
**范围：** insight-studio 对话与设置 UI；insight-api-go Skills PATCH 扩展  
**相关：** AI FAB / 设置三 Tab（`2026-08-05-ai-fab-dockable-panel-design.md`）

---

## 1. 问题与目标


| #   | 问题             | 目标                        |
| --- | -------------- | ------------------------- |
| 1   | 助手长文糊成「一大坨」    | Markdown 排版 + Cursor 简洁样式 |
| 2   | MCP 创建后不能改     | 支持编辑 name / URL / headers |
| 3   | Skill 不能在线改正文  | 用户包可编辑 `SKILL.md`；官方只读    |
| 4   | @ 提及图标全是 table | 分析 / 表 / 视图类型分图标          |


### 非目标（一期）

- 按句号软拆无换行长文
- Skill 元信息（skill.json）编辑、官方另存为副本
- 完整 GFM / KaTeX / 重型 MD 编辑器
- MCP OAuth 等鉴权增强

---

## 2. 产品决策（已确认）


| 决策点        | 结论                                |
| ---------- | --------------------------------- |
| 排版方案       | Markdown 渲染（方案 A），**不用**软分段       |
| 视觉         | Cursor 简洁风：轻间距、弱代码块底、标题不大、无厚卡片/炫光 |
| Skill 编辑范围 | 仅 `SKILL.md` 正文                   |
| 官方 Skill   | **只读**（方案 A）；仅用户导入可编辑             |
| 实现打包       | 一轮四项一起做（方案 1）                     |


---



## 3. 助手消息 Markdown（Cursor 风）

**文件：** `AiMessageList.vue`（`renderMd` + `.msg__ai.md` 样式）

**解析（保持轻量，可微调现有实现）：**

- 空行分段 → `<p>`
- `#`–`####` 标题、`-`/`*` 列表、围栏代码块、表格、`**bold**`、``code``
- 先 HTML escape 再替换；继续 emoji 剥离兜底

**样式目标：**

- 行高 ≈ **1.6**；段间距 ≈ **0.65em**
- 标题字重略增、字号接近正文
- 列表紧凑、左侧适度缩进
- `pre`：浅底、小圆角、等宽、适中 padding
- 用户消息仍纯文本 + `pre-wrap`

---



## 4. MCP 编辑

**UI：** `CapabilitiesPanel.vue` MCP Tab（设置内嵌）

- 每行增加「编辑」：回填名称 / URL / Headers 到上方表单（或编辑态面板）
- 提交调用已有 `aiMcpApi.patch(id, { name, url, headers })`
- 保存成功后可自动 `refresh`（推荐）；保留启用 / 刷新 / 删除

**后端：** 无需新契约（PATCH 已支持）。

---



## 5. Skill 正文编辑

**后端：** `PATCH /api/ai/skills/:id` 扩展：

```json
{ "enabled": true, "body": "markdown…" }
```

- `body` 非空时写入该 skill 目录 `SKILL.md`
- **官方**（`source=official`）：写 body → **403 forbidden**（与删除策略一致）
- 用户包：允许写；返回更新后的 `SkillDetail` 或 `Info`

**前端：**

- 用户 Skill：预览区改为可编辑 textarea +「保存」
- 官方：只读 `<pre>` / 禁用保存
- `aiSkillsApi` 增加 `updateBody(id, body)`（或扩展 setEnabled 为更通用 patch）

---



## 6. @ 提及图标

**文件：** `AiInputBar.vue`；复用 `SidebarTreeNode` 的 `VIEW_ICON` 映射（可抽到共享 util 避免漂移）


| kind       | 图标                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| `analysis` | `database`                                                                                    |
| `table`    | `table`                                                                                       |
| `view`     | 按 `view.type`：`bar` / `line` / `scatter` / `box` / `pie` / `heatmap` / `bignumber`，缺省 `table` |


菜单项与 chip 共用同一 `iconForMention(target)`。

---



## 7. 测试计划

1. 助手消息含标题/列表/代码块时排版清晰，非糊成一块
2. MCP：编辑 URL/名称保存后列表更新；刷新 tools 可用
3. 用户 Skill：改 body 保存后预览一致；官方无保存或保存 403
4. @ 菜单与 chip：分析=database、表=table、柱状图视图=bar 等
5. 回归：FAB / 设置 Tab / 用户隔离不受影响

---



## 8. 验收标准

- [ ] 助手 Markdown 呈现 Cursor 简洁风  
- [ ] MCP 可修改并保存  
- [ ] 用户 Skill 可在线编辑 `SKILL.md`；官方只读  
- [ ] @ 提及三类图标正确  