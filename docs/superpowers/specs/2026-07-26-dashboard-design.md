# Dashboard（自定义看板）设计说明

**日期：** 2026-07-26  
**状态：** 草案（待确认后进入实现）  
**范围：** insight-studio 内按 Analysis 组织的多组件看板；含前端可组合看板（P1）与后端联动刷新（P2）

---

## 1. 问题与目标

### 用户要什么

1. **自定义看板**：把已建好的表 / 图表视图（View）摆到同一页，自由排列组合，形成「一屏总览」。
2. **数据联动（后续）**：源表或图表配置变化后，看板上引用的卡片自动反映最新数据与样式（非静态截图）。

### 非目标（本设计明确不做）

- 跨多个 Analysis 拼看板（P1）；跨项目看板放到更后。
- 在看板内重做完整 Chart 配置编辑器（应跳回原视图编辑）。
- 复制一份独立的「看板专用图表配置」作为默认模型（易与源视图分叉；见 §3）。

---

## 2. 产品决策（建议默认）

| 决策点 | 建议 | 理由 |
| --- | --- | --- |
| 归属 | Dashboard **挂在单个 Analysis 下** | 与现有表/视图/流程图同文档，持久化简单 |
| 组件来源 | 只引用本 Analysis 内已有 `ViewNode`（表视图或图表视图） | 「调用设置好的表、图表」；配置单一真相源 |
| 引用方式 | **Live ref**：`{ tableId, viewId }`，不拷贝 `ChartConfig` / 行数据 | P1 本地改图即看板更新；为 P2 后端同步打底 |
| 布局 | 网格 + 可拖拽改位置/尺寸（列数固定，如 12 列） | 比自由绝对坐标更稳，也比纯模板更灵活 |
| 入口 | 侧栏「Dashboards」分组 + 工作区第三种模式 `dashboard` | 与 workspace / flowchart 并列，不挤占单表编辑 |
| 空态 | 新建空看板 → 「添加组件」从视图树挑选 | 与 Add data / 创建 view 心智一致 |
| 表组件 | 支持嵌入精简 DataGrid（只读、采样/分页） | 用户明确要表；图表同页更常见 |

若产品更希望「看板内微调样式不改源视图」，可在 P1.5 增加 **可选 override**（仅 style 层），默认仍跟源。

---

## 3. 领域模型

### 3.1 新增类型（草案）

```ts
/** 挂在 Analysis 上的看板。 */
interface Dashboard {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  /** 12 列网格布局。 */
  layout: DashboardLayout
  widgets: DashboardWidget[]
}

interface DashboardLayout {
  /** 网格列数，固定 12。 */
  columns: 12
  /** 行高基准（px），用于换算 widget.h。 */
  rowHeight: number // e.g. 40
  gap: number // e.g. 8
}

type DashboardWidgetType = 'chart' | 'table'

interface DashboardWidget {
  id: string
  type: DashboardWidgetType
  /** 指向本 Analysis 内表 + 视图。 */
  ref: { tableId: string; viewId: string }
  /** 网格坐标：x/y 起点，w/h 跨度（单位：列 / 行）。 */
  grid: { x: number; y: number; w: number; h: number }
  /** 可选：仅看板层展示名；默认用 ViewNode.name。 */
  title?: string
  /**
   * 可选覆盖（P1.5+）。P1 可不实现。
   * 未设字段一律继承源 ViewNode.chart。
   */
  styleOverride?: Partial<ChartStyle>
}
```

### 3.2 Analysis 扩展

```ts
interface Analysis {
  // ...existing
  dashboards: Dashboard[]
}
```

迁移：读入时若缺 `dashboards` → `[]`。

### 3.3 引用完整性

- 删除 / 提升视图导致 `viewId` 失效 → 组件显示 **Broken widget**（可移除或重新绑定），不静默丢数据。
- 源视图从 chart → table（或反之）→ 组件 `type` 与源不一致时，以 **源 ViewNode.type** 为准渲染（或提示用户改 type）。

### 3.4 与现有概念的关系

```
Analysis
├── tables[] → views[]（ViewNode：配置 + 管道真相源）
├── steps[] / flowchartLayout（编排）
└── dashboards[] → widgets[]（只存布局 + 引用）
```

数据路径（每张卡片独立、可并行）：

```
widget.ref → runPipeline(analysis, tableId, viewId)
          → buildChartOption(...) 或精简 DataGrid
          → ChartPanel / TableWidget
```

---

## 4. UX 草图

### 4.1 导航

- 侧栏：在 ANALYSIS DATA 下（或旁）增加 **Dashboards** 列表。
- 选中看板 → `store.mode = 'dashboard'`，`selectedDashboardId`。
- 顶栏可保留 Flowchart 切换；看板模式下主区为网格画布。

### 4.2 看板编辑

- **添加组件**：弹层选表/视图（仅本 Analysis）；默认尺寸 chart `w=6 h=8`，table `w=12 h=10`。
- **拖拽 / 缩放**：基于网格吸附。
- **卡片工具条**：打开源视图（跳转 workspace）、移除、（可选）改标题。
- **只读预览 vs 编辑布局**：可用同一页 +「编辑布局」开关，避免误拖。

### 4.3 与单视图编辑的分工

| 动作 | 在哪做 |
| --- | --- |
| 映射轴、配色、回归、过滤、转换 | 原 Table/Chart 工作区 |
| 排版、一屏多图、改卡片标题 | Dashboard |
| 改源配置后看板是否更新 | **是（live ref）** |

---

## 5. 前端架构（P1）

### 5.1 模块建议

| 路径 | 职责 |
| --- | --- |
| `shared/types.ts` | Dashboard* 类型 |
| `shared/factories.ts` | `createDashboard` / `createWidget` |
| `shared/migrateDashboards.ts` | 缺省字段迁移 |
| `modules/dashboard/DashboardMain.vue` | 模式主壳 |
| `modules/dashboard/DashboardCanvas.vue` | 网格 + 拖拽 |
| `modules/dashboard/DashboardWidgetCard.vue` | 卡片壳 + 标题 + 错误态 |
| `modules/dashboard/ChartWidget.vue` | pipeline + buildChartOption + ChartPanel |
| `modules/dashboard/TableWidget.vue` | pipeline + 只读精简表 |
| `modules/dashboard/AddWidgetDialog.vue` | 选视图 |
| `stores/analysisStore.ts` | `mode: 'dashboard'`、`selectedDashboardId` |

### 5.2 性能要点（沿用近期优化）

- 卡片 **视口内** 才跑重图表（IntersectionObserver）。
- `runPipeline` 结果按 `(tableId, viewId, analysis.updatedAt)` 短时缓存，多卡同视图不重复算。
- 行数据保持 `markRaw`；看板不 deep-watch 整表。
- Plotly 继续懒加载。

### 5.3 为何 P1 不做「快照」

快照会立刻满足「固定某一刻」的展示，但与用户第 2 点「数据变了看板也要变」冲突。  
**Live ref 同时服务 P1 本地联动与 P2 后端推送。**

---

## 6. 后端与实时更新（P2）

### 6.1 目标

- Analysis（含 dashboards、views、表数据或数据源指针）存服务端。
- 源数据 / 视图配置变更后，打开看板的客户端看到新数据与新样式。

### 6.2 推荐形态

保持现有 `AnalysisRepository` 抽象，增加 HTTP 实现：

```ts
interface AnalysisRepository {
  list(): Promise<AnalysisSummary[]>
  get(id: string): Promise<Analysis | undefined>
  put(analysis: Analysis): Promise<void>
  // P2:
  // subscribe?(id: string, onChange: (patch | full) => void): Unsubscribe
}
```

### 6.3 数据更新策略（由轻到重）

| 阶段 | 机制 | 适用 |
| --- | --- | --- |
| P2a | 打开看板 / 切回页时 `get` 拉最新 Analysis | 多用户轻度协作 |
| P2b | WebSocket / SSE：`analysis.updated` + `revision`；客户端 refetch 或 apply patch | 多人同时看看板 |
| P2c | 表数据外置（查询引擎 / 对象存储），Analysis 只存 schema + 视图配置；看板按 `dataVersion` 使缓存失效 | 大数据、外部 ETL |

**看板本身不存图数据副本**；刷新链路永远是：

`数据或配置变更 → Analysis revision++ → 客户端失效 widget 缓存 → 再 runPipeline / buildChartOption`。

### 6.4 样式更新

- 源 `ViewNode.chart` 变更 → 同 revision 下发 → ChartWidget 重建 option。  
- 若有 `styleOverride`，合并规则：`{ ...source.style, ...override }`。

### 6.5 权限与冲突（简述）

- 看板编辑 vs 视图编辑可并行；以 `updatedAt` / `revision` 乐观锁，冲突时提示刷新。
- 只读分享链接（更后）：`/share/dashboard/:token` 只渲染 widgets。

---

## 7. 分阶段交付

### P1 — 本地自定义看板（前端）

1. 类型 + 迁移 + 工厂  
2. 侧栏列表 / 新建 / 重命名 / 删除  
3. 网格画布 + 添加/移除/拖拽缩放组件  
4. ChartWidget / TableWidget（live pipeline）  
5. Broken ref 处理；「打开源视图」  
6. 单测：迁移、引用解析、同视图多卡缓存键  

### P1.5 — 体验增强（可选）

- 布局锁定、组件标题、简单模板（2×2 图）  
- `styleOverride`  
- 导出看板 PNG/PDF（多卡拼接）  

### P2 — 后端与联动

1. HTTP Repository 替换 Dexie（或双写）  
2. revision / ETag  
3. 打开刷新 +（可选）SSE  
4. 外置数据源时的 `dataVersion` 缓存失效  

---

## 8. 风险与开放问题

| 风险 | 缓解 |
| --- | --- |
| 一页多 Plotly 卡主线程 | 视口懒渲染 + 限制同时 react 数 |
| 大表嵌入看板过重 | TableWidget 强制采样 + 虚拟滚动 |
| 用户误以为看板有独立配置 | 文案：「来自视图 XXX · 点击编辑源」 |
| 网格库选型 | 优先轻量自研 12 列网格；若交互成本高再引 `grid-layout` 类库 |

**待你确认：**

1. Dashboard 是否接受 **仅本 Analysis 内** 引用？（推荐是）  
2. P1 是否必须同时支持 **表 + 图**，还是先做图、表稍后？  
3. 布局更倾向 **12 列网格拖拽**，还是先做 **固定模板**（更快上线）？  

确认后可拆实现计划并开工。
