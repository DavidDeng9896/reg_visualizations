# Dashboard（独立看板）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付顶层独立 Dashboard：首页「看板 | Insight」切换；看板壳左侧多 Dashboard 列表；右侧 12 列拖拽网格；组件可跨多个 Insight live 引用表/图。

**Architecture:** `Dashboard` 与 `Analysis` 平级持久化（Dexie `dashboards`）。Widget 存 `{ analysisId, tableId, viewId }` + grid，不拷贝配置/数据。渲染时按需 `get(analysisId)` → `runPipeline` → `buildChartOption` / 只读表。

**Tech Stack:** Vue 3, Vue Router, Pinia, Dexie, Plotly（复用 ChartPanel）, Vitest  
**Spec:** `docs/superpowers/specs/2026-07-26-dashboard-design.md`

## Global Constraints

- Dashboard **不**写入 `Analysis` 文档
- Widget 必须支持 **跨多个 Insight**；ref 含 `analysisId`
- P1 同时支持 `chart` + `table` widget
- 画布：**12 列网格**，可拖拽改位置与尺寸
- Live ref only；不在看板内做完整图表配置编辑
- 坏引用 → Broken 态，可移除/重绑；「打开源」跳 Insight 工作区
- 中文 UI 文案与现有 toast 风格一致
- 性能：视口懒渲染、按 `(analysisId, tableId, viewId, updatedAt)` 缓存 pipeline 结果

## File map

| Path | Responsibility |
|------|----------------|
| `shared/types.ts` | `Dashboard`, `DashboardWidget`, `DashboardLayout` |
| `shared/factories.ts` | `createDashboard`, `createDashboardWidget` |
| `shared/db.ts` | Dexie version + `dashboards` store |
| `shared/dashboardRepository.ts` | CRUD |
| `stores/dashboardStore.ts` | list / current / mutate / select |
| `modules/home/HomeSegmentNav.vue` | 看板 \| Insight 分段 |
| `modules/analyses/AnalysisListPage.vue` | 接入顶栏（Insight） |
| `modules/dashboard/DashboardShellPage.vue` | 侧栏 + 主区壳 |
| `modules/dashboard/DashboardSidebar.vue` | 名称列表 CRUD |
| `modules/dashboard/DashboardCanvas.vue` | 12 列网格拖拽 |
| `modules/dashboard/grid.ts` | 碰撞/吸附纯函数 |
| `modules/dashboard/DashboardWidgetCard.vue` | 卡片壳 |
| `modules/dashboard/ChartWidget.vue` | 跨 Analysis 拉数 + 图 |
| `modules/dashboard/TableWidget.vue` | 跨 Analysis 拉数 + 只读表 |
| `modules/dashboard/widgetData.ts` | resolve ref + pipeline 缓存 |
| `modules/dashboard/AddWidgetDialog.vue` | 选 Insight → 选视图 |
| `app/router.ts` | `/dashboards`, `/dashboards/:id` |
| `tests/unit/dashboard/*.spec.ts` | grid / resolve / repository |

---

### Task 1: Types + factories + Dexie + repository

**Files:**
- Modify: `shared/types.ts`, `shared/factories.ts`, `shared/db.ts`
- Create: `shared/dashboardRepository.ts`
- Create: `tests/unit/dashboard/repository.spec.ts`

**Interfaces:**
- `Dashboard`, `DashboardLayout`, `DashboardWidget`, `DashboardWidgetType`
- `DashboardWidget.ref: { analysisId, tableId, viewId }`
- `dashboardRepository.list|get|put|delete`

- [ ] **Step 1: 在 `types.ts` 增加 Dashboard 类型（见 spec §4.1）**

- [ ] **Step 2: `createDashboard(name)` / `createDashboardWidget(...)`**

默认 layout：`{ columns: 12, rowHeight: 40, gap: 8 }`。  
默认 grid：chart `{ x:0,y:0,w:6,h:8 }`，table `{ x:0,y:0,w:12,h:10 }`（调用方再避让）。

- [ ] **Step 3: Dexie bump version，加 `dashboards: 'id, name, updatedAt'`**

- [ ] **Step 4: Repository + 单测（fake-indexeddb）**

- [ ] **Step 5: Commit** `feat(insight-studio): Dashboard 类型与本地持久化`

---

### Task 2: dashboardStore + 路由 + 首页分段

**Files:**
- Create: `stores/dashboardStore.ts`
- Create: `modules/home/HomeSegmentNav.vue`
- Modify: `app/router.ts`, `AnalysisListPage.vue`

**行为:**
- 路由：`/insights`（或保留 `/`）→ Insight 列表；`/dashboards`、`/dashboards/:id` → 看板壳
- `HomeSegmentNav`：当前段高亮；切到看板 → `/dashboards`（有最近 id 可进 `/dashboards/:last`）
- Store：`items`、`currentId`、`loadList`、`loadOne`、`mutate`、`create`、`rename`、`remove`

- [ ] **Step 1: 实现 store（防抖 save 可对齐 analysisStore 400ms）**

- [ ] **Step 2: 路由注册；壳页先放占位组件**

- [ ] **Step 3: Insight 列表页顶部接入 `HomeSegmentNav`**

- [ ] **Step 4: 手动点通：Insight ↔ 看板路由切换**

- [ ] **Step 5: Commit** `feat(insight-studio): 首页看板|Insight 切换与看板路由`

---

### Task 3: 看板壳 + 侧栏列表 CRUD

**Files:**
- Create: `DashboardShellPage.vue`, `DashboardSidebar.vue`

**行为:**
- 左：Dashboard 名称列表；点击 `router.push(/dashboards/:id)`
- 新建 → 对话框填名 → put → 选中
- 重命名 / 删除（删除后选中邻近项或空态）
- 右：未选中空态「选择或新建看板」；选中后挂 Canvas（Task 4 前可空）

- [ ] **Step 1: Shell 布局（顶栏分段 + 左列表 + 右主区）**

- [ ] **Step 2: 侧栏 CRUD 接 store**

- [ ] **Step 3: `:id` 与 store.currentId 双向同步；非法 id → 回 `/dashboards`**

- [ ] **Step 4: Commit** `feat(insight-studio): 看板侧栏多 Dashboard 切换`

---

### Task 4: 12 列网格纯函数 + Canvas 拖拽

**Files:**
- Create: `modules/dashboard/grid.ts`
- Create: `tests/unit/dashboard/grid.spec.ts`
- Create: `DashboardCanvas.vue`

**grid.ts 职责:**
- `clampWidget(grid, columns=12)`
- `findNextSlot(widgets, w, h)` — 添加时避让
- `moveWidget` / `resizeWidget`（边界夹紧；P1 允许重叠或简单下推——**推荐 P1 允许短暂重叠，mouseup 时 clamp；不做复杂 collision 引擎**）

**Canvas:**
- CSS grid 或 absolute + `%` 宽度按 `w/12`
- 拖拽改 `x,y`；边角 resize 改 `w,h`（min w=2,h=4）
- 「编辑布局」开关：关则禁用拖拽
- 变更写回 `dashboardStore.mutate`

- [ ] **Step 1: TDD 写 grid 单测并实现**

- [ ] **Step 2: Canvas 渲染占位块（无真实图）验证拖拽**

- [ ] **Step 3: Commit** `feat(insight-studio): 看板 12 列拖拽网格`

---

### Task 5: widgetData 解析 + Chart/Table widget

**Files:**
- Create: `widgetData.ts`, `ChartWidget.vue`, `TableWidget.vue`, `DashboardWidgetCard.vue`
- Create: `tests/unit/dashboard/widgetData.spec.ts`

**widgetData:**
```ts
resolveWidgetSource(ref): Promise<
  | { ok: true; analysis; table; view; result: ViewResult }
  | { ok: false; reason: 'missing-analysis' | 'missing-table' | 'missing-view' }
>
```
- 短时缓存：`Map` key = `${analysisId}:${tableId}:${viewId}:${updatedAt}`
- Chart：`view.type !== 'table'` 且有 `chart` → `buildChartOption` → `ChartPanel`
- Table：源为 table 视图或 widget.type==='table' → 精简只读表（可用轻量 HTML table 或裁剪版 vxe；**禁止**挂载完整 DataGrid 编辑壳）
- IntersectionObserver：进入视口才 resolve/渲染

- [ ] **Step 1: resolve + 缓存单测（mock repository.get）**

- [ ] **Step 2: ChartWidget / TableWidget + Card（标题、来源脚注「来自 Insight · 名」、Broken）**

- [ ] **Step 3: Canvas 接入真实 widget**

- [ ] **Step 4: Commit** `feat(insight-studio): 看板 Chart/Table live 组件`

---

### Task 6: 添加组件对话框 + 打开源视图

**Files:**
- Create: `AddWidgetDialog.vue`
- Modify: Canvas 工具条、Card 菜单

**添加流程:**
1. 列出 `analysisRepository.list()`  
2. 选中 Analysis → `get` → 展平 views（表节点可选：无 viewId 时用「源表」——**P1 约定：表组件也必须选一个 viewId；若只有源表，可创建/选择 type=table 的视图，或允许 `viewId` 可选表示源表**）  
   - **决定：允许 `viewId?: string`；缺省 = 源表只读。** 更新 types 若尚未写 optional。  
3. 选 type（若视图为 chart 则默认 chart；源表/table 视图 → table）  
4. `findNextSlot` + push widget

**打开源:**
- `router.push({ path: `/analysis/${analysisId}`, query: { tableId, viewId } })`  
- WorkspacePage onMounted 读 query 调用 `store.select`

- [ ] **Step 1: 确认 `ref.viewId` optional 并文档化**

- [ ] **Step 2: AddWidgetDialog**

- [ ] **Step 3: Workspace 支持 query 选中**

- [ ] **Step 4: Broken 卡可「移除」**

- [ ] **Step 5: Commit** `feat(insight-studio): 看板添加跨 Insight 组件与跳转源视图`

---

### Task 7: 打磨 + 验证

- [ ] **Step 1: 空态文案、加载态、删除确认**

- [ ] **Step 2: `npm test` + `npm run typecheck`**

- [ ] **Step 3: 手动验收清单**
  - 首页分段切换
  - 多看板侧栏切换（细胞培养 / Assay 命名）
  - 同一看板添加来自两个不同 Insight 的图 + 表
  - 拖拽缩放后刷新仍在
  - Insight 改图配置后回看板可见更新（同浏览器，analysis 已 save）
  - 删除源 Analysis → Broken

- [ ] **Step 4: Commit** `chore(insight-studio): 看板 P1 验收与类型检查`

---

## P2（本计划不实现，仅占位）

- `DashboardRepository` / `AnalysisRepository` HTTP
- `revision` + 打开刷新 / SSE
- 按 `analysisId` 失效 widget 缓存

## 执行方式

实现时推荐 **subagent-driven-development**：按 Task 1→7 顺序，每 Task 完再进下一个；每 Task 结束 commit。
