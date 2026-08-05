# AI 右下角入口 + 可拖吸附对话窗 + 设置三 Tab 设计说明

**日期：** 2026-08-05  
**状态：** 设计已确认，待实现  
**范围：** insight-studio 壳层 / AI 抽屉与设置；不改 Go API 契约  
**相关：** Skills/MCP 能力仍按用户隔离（见 `2026-08-05-user-scoped-ai-settings-design.md`）

---

## 1. 问题与目标

### 痛点

1. AI 相关入口分散：Header sparkle（对话）、侧栏「能力」（Skills/MCP）、抽屉内齿轮（模型），心智不统一。
2. 对话为右侧固定 480px 抽屉且无遮罩，打开后遮挡 flowchart 右侧内容，无法挪开。

### 目标

1. **唯一对话入口**：右下角全局悬浮球（FAB）；去掉 Header sparkle。
2. **能力并入 AI 设置**：齿轮打开设置 Modal，三 Tab —— **模型 | Skills | MCP**；去掉侧栏「能力」入口。
3. **对话窗可拖 + 右缘吸附**：默认停靠右侧；拖出为悬浮窗；靠近右缘再吸附；位置持久化。

### 非目标（一期）

- 左/底/顶吸附，多对话窗
- 打开对话时强制压缩主布局（靠用户拖走解决遮挡）
- 八向缩放把手（宽度拖可选，非必须）
- 改后端 API / 用户体系

---

## 2. 产品决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| 入口 | 仅右下角 FAB（方案 A） |
| Header sparkle | 删除 |
| Skills/MCP 归属 | AI 设置内 Tab（方案 B） |
| 侧栏「能力」 | 删除 |
| 对话形态 | 可拖 + 可贴右缘停靠（方案 B） |
| 遮罩 | 无全屏 scrim；画布在窗下可点（悬浮时尤其重要） |

---

## 3. 信息架构

```text
App（全局）
  ├─ AiFab          右下角球 → toggle 对话窗
  ├─ AiPanel        停靠 | 悬浮对话（原 AiDrawer 演进）
  │     └─ 齿轮 → AiSettingsModal
  │              ├─ 模型（现有）
  │              ├─ Skills（原 CapabilitiesPanel）
  │              └─ MCP（原 CapabilitiesPanel）
  └─ AppShell       Header 无 sparkle；ShellSidebar 无能力按钮
```

- FAB 与 AiPanel 挂在 `App.vue`（与现 `AiDrawer` 同级），全路由可见。
- 模拟用户切换仍在 Header；与 AI 入口无关。

---

## 4. 对话窗：拖动与吸附

### 4.1 模式

| mode | 行为 |
| --- | --- |
| `docked`（默认） | 贴视口右缘；宽约 420–480px；`top` 在 Header 下（48px）或记住的 top；高度至视口底 |
| `floating` | 独立窗；标题栏拖动改 `{x,y}`；无遮罩 |

### 4.2 吸附与边界

- 拖动**松手**时：窗右缘距视口右 ≤ **24px** → `docked`
- 从停靠态拖出超过阈值（如水平位移 > 24px）→ `floating`，跟指针
- 钳制：窗体不拖出视口（外边距 ≥ 8px）
- 拖动手势：标题栏（非输入区、非按钮）`pointerdown` → move → up；与现有 `ISplitPane` 同类指针逻辑

### 4.3 打开 / 关闭与 FAB

- 点 FAB → 打开面板；已打开则聚焦/置顶
- 面板关闭钮 / Esc → 关闭；FAB 始终可点（除非被面板完全盖住时的策略见下）
- **FAB 显隐建议：**
  - `docked` 且打开：隐藏 FAB（避免叠在右下角）
  - `floating` 或关闭：显示 FAB
- `z-index`：面板 > FAB > 画布；均低于或等于现有 modal 体系中合理层级（面板可用 `--is-z-modal`，FAB 略低一档）

### 4.4 持久化

`localStorage` 键建议：`insight.ai.panel.v1`

```json
{
  "mode": "docked" | "floating",
  "floating": { "x": 0, "y": 48, "w": 480 }
}
```

非法 / 越界 → 回退 `docked` 默认。

---

## 5. 设置三 Tab

- **模型**：保持现 `AiSettingsModal` 表单（baseUrl、Key、model、maxIterations 等）；AI config 仍全局共享。
- **Skills / MCP**：迁入原 `CapabilitiesPanel` 行为（列表、开关、zip 导入、MCP CRUD/刷新）；请求继续带 `X-User-Id`。
- 实现：抽出 `SkillsMcpSettings.vue`（或 tabs 内嵌），`CapabilitiesPanel` 的 Modal 壳删除或改为薄包装；`ShellSidebar` 去掉挂载与按钮。

---

## 6. Header / 侧栏改动

| 位置 | 改动 |
| --- | --- |
| `AppHeader.vue` | 删除 AI sparkle 按钮与 `data-testid="ai-entry"`（测试改挂 FAB：`data-testid="ai-fab"`） |
| `ShellSidebar.vue` | 删除能力按钮与 `CapabilitiesPanel` |
| E2E / 冒烟 | 凡点 `ai-entry` 改为 `ai-fab` |

---

## 7. 测试计划

1. Header 无 sparkle；侧栏无「能力」。
2. FAB 打开/关闭对话；停靠默认；拖出悬浮；贴右吸附；刷新恢复。
3. 设置三 Tab：模型保存；Skills 开关/导入；MCP 列表（用户隔离回归仍过）。
4. flowchart：悬浮时右侧节点可点选；停靠时行为可接受（可拖走）。
5. Esc 关闭面板；运行中 agent 不因拖动中断（仅改 CSS/transform 位置）。

---

## 8. 验收标准

- [ ] 唯一 AI 入口为右下角 FAB
- [ ] Skills/MCP 仅能从 AI 设置进入
- [ ] 对话支持停靠与悬浮拖动，右缘吸附，位置可持久化
- [ ] 无全屏遮罩挡死画布
- [ ] 现有 AI 对话 / 设置 / 用户隔离行为不回退
