# Dashboard（自定义看板）设计说明

**日期：** 2026-07-26（修订 2026-07-27）  
**状态：** 产品决策已确认，可进入实现  
**范围：** insight-studio 顶层独立看板模式（P1）+ 后端联动刷新（P2）

---

## 1. 问题与目标

### 用户要什么

1. **自定义看板**：把 Insight（现有 Analysis）里已建好的表 / 图表视图摆到同一页，自由排列组合，形成「一屏总览」。
2. **数据联动（后续）**：源表或图表配置变化后，看板上引用的卡片自动反映最新数据与样式（非静态截图）。

### 非目标（本设计明确不做）

- 在看板内重做完整 Chart / 表配置编辑器（应跳回对应 Insight 工作区编辑）。
- 默认拷贝一份「看板专用图表配置」（易与源视图分叉；见 §3）。
- 把 Dashboard 嵌进某个 Analysis 文档（已否决）。

---

## 2. 产品决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| **归属** | Dashboard 为 **顶层独立实体**，**不挂在** Analysis 下 |
| **入口** | 首页顶部分段切换：**看板** \| **Insight**；Insight = 现有 Analysis 列表与工作流 |
| **看板壳布局** | 进入看板后：**左侧侧栏**列出用户定义的多个 Dashboard 名称（如「细胞培养」「Assay」）；点击切换当前看板；右侧为主画布 |
| **引用方式** | **Live ref**（不拷贝 ChartConfig / 行数据）；改源 Insight 后看板跟新 |
| **组件来源** | 引用 Insight（Analysis）内已有 `ViewNode`；ref 带 `analysisId` |
| **跨 Insight** | **一张看板可引用多个 Insight** 的表/图 |
| **P1 组件** | **表 + 图一起做** |
| **画布布局** | **12 列可拖拽网格**（非固定模板） |

---

## 3. 信息架构与导航

```
App Home
├── [ 看板 ]  ← 默认可进最近看板，或空态「新建看板」
│     └── /dashboards 或 /dashboards/:id
│           ├── 左侧：Dashboard 名称列表（+ 新建 / 重命名 / 删除）
│           └── 右侧：当前 Dashboard 网格画布
│
└── [ Insight ]  ← 现有 Analysis 列表（原首页）
      └── /analysis/:id  工作区（表 / 图 / 流程图）不变
```

### 3.1 首页顶栏

- 分段控件（segmented control）：`看板` | `Insight`
- 切换只换首页主内容区；路由建议：
  - `/` 或 `/insights` → Insight 列表（兼容现有 `/`）
  - `/dashboards` → 看板壳（侧栏 + 画布）；无选中时右侧空态
  - `/dashboards/:id` → 选中对应看板
- 从看板卡片「打开源视图」→ 跳 `/analysis/:analysisId` 并选中对应 table/view。

### 3.2 看板页布局（壳）

```
┌─────────────────────────────────────────────┐
│  Logo   [ 看板 | Insight ]     用户/设置…   │  ← 与首页同级顶栏
├──────────┬──────────────────────────────────┤
│ DASHBOARDS│  细胞培养 · 编辑布局 · 添加组件   │
│          │                                  │
│ · 细胞培养│   ┌─────────┐  ┌─────────┐      │
│ · Assay  │   │ chart   │  │ chart   │      │
│ · …      │   └─────────┘  └─────────┘      │
│ [+ 新建] │   ┌──────────────────────┐      │
│          │   │ table                │      │
│          │   └──────────────────────┘      │
└──────────┴──────────────────────────────────┘
```

- 侧栏项 = 用户定义的 Dashboard **配置名称**（不是 Analysis 名）。
- 点击侧栏项 → 切换 `selectedDashboardId`（路由同步 `:id`）。
- 侧栏支持：新建、重命名、删除、搜索（P1.5）。

---

## 4. 领域模型

### 4.1 顶层独立文档（不在 Analysis 内）

```ts
/** 顶层看板文档（与 Analysis 平级持久化）。 */
interface Dashboard {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
}

interface DashboardLayout {
  columns: 12
  rowHeight: number // e.g. 40
  gap: number // e.g. 8
}

type DashboardWidgetType = 'chart' | 'table'

interface DashboardWidget {
  id: string
  type: DashboardWidgetType
  /** Live 引用：可跨多个 Insight；viewId 缺省表示源表只读。 */
  ref: {
    analysisId: string
    tableId: string
    viewId?: string
  }
  grid: { x: number; y: number; w: number; h: number }
  /** 看板层展示名；默认用源 ViewNode.name。 */
  title?: string
  /** P1.5+ 可选样式覆盖。 */
  styleOverride?: Partial<ChartStyle>
}
```

`Analysis` **不增加** `dashboards` 字段。

### 4.2 持久化

| Store | 内容 |
| --- | --- |
| Dexie `analyses`（现有） | Insight / Analysis 文档 |
| Dexie `dashboards`（新增） | 顶层 Dashboard 文档 |

```ts
interface DashboardRepository {
  list(): Promise<Dashboard[]>
  get(id: string): Promise<Dashboard | undefined>
  put(dashboard: Dashboard): Promise<void>
  delete(id: string): Promise<void>
}
```

P2 同样抽象为 HTTP，与 `AnalysisRepository` 并列。

### 4.3 引用完整性

- `analysisId` / `tableId` / `viewId` 任一失效 → **Broken widget**（可移除或重新绑定）。
- 源 Analysis 被删：该 Analysis 上所有引用统一 broken。
- 渲染时以源 `ViewNode.type` 为准（chart vs table），与 widget.type 不一致时提示并按源渲染。

### 4.4 与 Insight 的关系

```
Dashboard (顶层)                    Analysis (Insight)
└── widgets[].ref ──────────────►  tables[] → views[]
        analysisId + tableId + viewId     ChartConfig / filters / rows
```

数据路径：

```
widget.ref
  → load Analysis(analysisId)
  → runPipeline(analysis, tableId, viewId)
  → buildChartOption(...) 或精简 DataGrid
  → ChartPanel / TableWidget
```

---

## 5. UX 细节

### 5.1 看板编辑

- **添加组件**：弹层先选 Insight（Analysis），再选其下表/视图；默认尺寸 chart `w=6 h=8`，table `w=12 h=10`。
- **拖拽 / 缩放**：12 列网格吸附。
- **卡片工具条**：打开源视图（进 Insight 工作区）、移除、改标题。
- **编辑布局** 开关：关则不可拖，避免浏览时误操作。

### 5.2 与 Insight 编辑的分工

| 动作 | 在哪做 |
| --- | --- |
| 映射轴、配色、回归、过滤、转换 | Insight 工作区 |
| 排版、一屏多图、看板命名、卡片标题 | 看板模式 |
| 改源后看板是否更新 | **是（live ref）** |

---

## 6. 前端架构（P1）

### 6.1 路由

| 路径 | 页面 |
| --- | --- |
| `/` 或 `/insights` | Insight 列表（现 AnalysisListPage；顶栏带分段） |
| `/dashboards` | 看板壳，未选中 |
| `/dashboards/:id` | 看板壳，选中 id |
| `/analysis/:id` | 现有工作区（不变） |

顶栏分段可抽为 `AppHomeChrome` / `HomeSegmentNav`，Insight 列表与看板壳共用。

### 6.2 模块建议

| 路径 | 职责 |
| --- | --- |
| `shared/types.ts` | `Dashboard*` 类型（与 Analysis 平级） |
| `shared/factories.ts` | `createDashboard` / `createWidget` |
| `shared/db.ts` | 新增 `dashboards` 表 |
| `shared/dashboardRepository.ts` | CRUD |
| `stores/dashboardStore.ts` | list / current / mutate / 选中 |
| `modules/home/HomeSegmentNav.vue` | 看板 \| Insight 切换 |
| `modules/dashboard/DashboardShellPage.vue` | 侧栏 + 主区 |
| `modules/dashboard/DashboardSidebar.vue` | 名称列表 + 新建等 |
| `modules/dashboard/DashboardCanvas.vue` | 网格 |
| `modules/dashboard/DashboardWidgetCard.vue` | 卡片壳 |
| `modules/dashboard/ChartWidget.vue` / `TableWidget.vue` | 按 ref 拉 Analysis 再渲染 |
| `modules/dashboard/AddWidgetDialog.vue` | 选 Analysis → 选视图 |
| `modules/analyses/AnalysisListPage.vue` | 接入顶栏分段（Insight 侧） |

### 6.3 性能

- 卡片视口内才渲染重图表。
- 缓存键：`(analysisId, tableId, viewId, analysis.updatedAt)`。
- 同行 `markRaw`；Plotly 懒加载；限制同时 `Plotly.react` 数量。

---

## 7. 后端与实时更新（P2）

### 7.1 目标

- Dashboard 与 Analysis 均服务端持久化。
- 任一被引用 Analysis 的数据/视图配置变更 → 打开该看板的客户端看到新数据与样式。

### 7.2 策略

| 阶段 | 机制 |
| --- | --- |
| P2a | 打开看板 / 切回前台时，按 widgets 涉及的 `analysisId` 批量 `get` |
| P2b | SSE/WebSocket：`analysis.updated { id, revision }` → 失效相关 widget 缓存并重算 |
| P2c | 外置数据源 + `dataVersion` |

看板文档变更（改布局）与 Analysis 变更分开推送：`dashboard.updated` / `analysis.updated`。

刷新链路：

```
Analysis 变更 → revision++
  → 订阅方失效缓存（按 analysisId）
  → 看板内相关 widget 再 runPipeline / buildChartOption
```

---

## 8. 分阶段交付

### P1 — 本地独立看板

1. 类型 + Dexie `dashboards` + Repository + Store  
2. 首页顶栏 **看板 \| Insight**；路由 `/dashboards`、`/dashboards/:id`  
3. 看板壳：左侧 Dashboard 名称列表，右侧画布  
4. 新建 / 重命名 / 删除看板  
5. 添加组件（选 Analysis → 视图）+ 网格拖拽  
6. Chart / Table widget（live ref）+ Broken 态 + 打开源视图  
7. 单测：repository、跨 Analysis 引用解析、缓存键  

### P1.5

- 侧栏搜索、布局锁定、标题、简单模板  
- `styleOverride`  
- 导出 PNG/PDF  

### P2

- Dashboard + Analysis HTTP API  
- revision / 打开刷新 / SSE  
- `dataVersion` 缓存失效  

---

## 9. 风险

| 风险 | 缓解 |
| --- | --- |
| 一页引用多个 Analysis，加载重 | 按需 get；视口懒渲染；批量预取当前看板用到的 analysisId |
| 用户分不清看板名 vs Insight 名 | 侧栏标题用「DASHBOARDS」；卡片脚注显示「来自 Insight · xxx」 |
| 多 Plotly 卡顿 | 并发限制 + 懒挂载 |

---

## 10. 决策状态

上表产品决策均已确认。实现计划见 `docs/superpowers/plans/2026-07-27-dashboard.md`。
