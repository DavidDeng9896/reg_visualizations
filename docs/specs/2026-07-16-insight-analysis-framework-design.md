# Insight Analysis 基础框架功能设计

> 日期：2026-07-16  
> 状态：待用户审阅  
> 来源：`Insight analysis 功能说明` + 截图 + `docs/features/charts/` + `docs/requirements/table-chart-integration.md`  
> 方案：单仓 Vue3 SPA + 领域模块化（方案 1）

## 0. 已确认决策

| 项 | 结论 |
| --- | --- |
| 范围 | **D**：贴近文档全貌（流程图 + 表合并 + 多级视图 + 图表主路径及全量能力） |
| 运行形态 | **纯前端**；Dexie/IndexedDB 持久化；Repository 接口预留换 API |
| 流程图 | **B**：轻量可编辑（拖位置、点选打开）；拓扑由侧栏结构推导 |
| 视图数据能力 | **C**：视图过滤 + 常用转换（选列/重命名/派生列/去重等） |
| UI | Vue3 + **Element Plus**；表 **vxe-table** |
| 项目 | **静态 Mock** 项目列表，本地存 `projectId` |
| 图表深度 | **C**：尽量对齐 `unified-charts` **全量**（含误差棒、双轴、拟合、套索打标、MODEL TABLES） |
| 图表引擎 | **Apache ECharts** |
| 表格编辑 | **双击改单元格**；支持类 Excel 编辑操作；**不支持单元格合并** |
| 占位 | Registry / Plate / Send output / Connect external：仅入口 |

---

## 1. 目标与非目标

### 1.1 目标

构建可本地运行的 **Insight Analysis 数据工作空间**，支持：

1. 创建/管理 Analysis（归属 Mock 项目）
2. 导入 CSV、合并表，形成可嵌套的表/视图树
3. 在视图上过滤、转换，并用 vxe-table 以类 Excel 方式编辑数据
4. 用流程图浏览结构并导航
5. 在表之上挂载六类科学图表，配置与验收对齐 `unified-charts`

### 1.2 非目标

- 真实后端、权限、协作、云同步
- Registry / Plate 真实取数；Send output；外部工具连接
- 在画布上增删节点/改连线拓扑
- 完整「节点式」多步转换流水线编排 UI
- Plotly/Custom code 可编程图；独立 Regression 图种；Notebook 嵌入
- **单元格合并**（明确不做）

---

## 2. 信息架构与页面布局

### 2.1 路由

| 路由 | 页面 |
| --- | --- |
| `/` | Analysis 列表（可按 Mock 项目筛选；「+」创建） |
| `/analyses/:analysisId` | Analysis 工作区（侧栏 + 主区） |

主区模式用应用状态切换（Flowchart / Workspace），不必强制拆子路由；可用 query 记录 `viewId`。

### 2.2 工作区布局

```text
┌─ Header ────────────────────────────────────────────────┐
│ 面包屑：项目 / Analysis 名    [Flowchart] [Send output*] [+ Add data]
├─ Left Sidebar ─────────┬─ Main ─────────────────────────┤
│ 搜索                    │  Flowchart 画布                │
│ ANALYSIS DATA [+]       │  或 Table/View Workspace       │
│  └ Table                │   ├ vxe-table（可编辑）         │
│     └ Views（多级）      │   └ Chart 区（chartPosition）   │
│                         │  右侧：CONFIGURE / STYLE 侧栏   │
│ [Connect external*]     │                                │
└─────────────────────────┴────────────────────────────────┘
* 占位：点击提示「后续版本」
```

### 2.3 主导航行为

| 操作 | 行为 |
| --- | --- |
| 侧栏选中节点 | 打开对应表/视图 Workspace |
| Header「Flowchart」 | 主区切流程图 |
| 「跳转到流程图」 | 切流程图并居中/高亮节点 |
| 「+ Add data」/ 表旁 + | 创建表菜单（CSV / Combine；Registry、Plate 占位） |

---

## 3. 领域数据模型与持久化

### 3.1 持久化

| 层 | 技术 | 内容 |
| --- | --- | --- |
| 主存储 | Dexie / IndexedDB | Analysis、表 schema/rows、视图、过滤/转换、图表配置、流程图坐标 |
| 轻量偏好 | localStorage | 最近 analysisId、侧栏折叠等 |
| 运行时 | Pinia | 当前 Analysis 工作副本；写操作防抖落盘 |

CSV 等大体量数据只进 IndexedDB。`AnalysisRepository` 抽象读写，便于日后换 HTTP。

### 3.2 逻辑模型

```text
Project (mock 静态)
  └── Analysis
        ├── AnalysisTable[]
        │     ├── columns[], rows[]
        │     ├── source: csv | combine | registry* | plate*
        │     ├── tableFilters[]          # 作用于所有后代视图
        │     └── ViewNode[]              # 可多级嵌套
        │           ├── viewType: table | bar | line | scatter | box | pie | heatmap
        │           ├── viewFilters[]
        │           ├── transforms[]
        │           ├── chartConfig
        │           └── children[]
        └── FlowchartLayout               # nodeId → {x,y}
```

### 3.3 关键规则

| 规则 | 说明 |
| --- | --- |
| 视图不向上写配置 | 过滤/转换/图表配置不回写父表；兄弟视图互不影响 |
| 表级过滤向下 | `tableFilters` 应用于该表下所有后代视图的数据输入 |
| 单元格编辑写回 | 见 §5.3：对**可编辑数据源**的编辑持久化到对应 `rows` |
| 合并 / 提升 | Combine 与「提升为表」物化新 `AnalysisTable` |
| 流程图拓扑 | 边由父子/combine 引用推导；用户只存节点坐标 |
| 图表取数 | 管道结果全量行；超过 N 采样并提示（默认 N=10000） |

### 3.4 ID 与一致性

- 客户端 UUID；Analysis 含 `updatedAt`
- 导入/合并用 Dexie transaction，避免半截写入
- 删除表前检查 combine 依赖：**有依赖则阻止并列出依赖方**

---

## 4. Analysis 表：CSV、合并、创建视图

### 4.1 创建菜单

| 项 | 行为 |
| --- | --- |
| From CSV | 完整实现 |
| By combining tables | 完整实现（Left/Inner/Right/Full Join + Append） |
| From Registry / From Plate | 入口可见，禁用或 toast「暂未实现」 |

### 4.2 From CSV

1. 选择或拖放 `.csv` → 解析（papaparse）
2. 右侧预览前 N 行；表名默认可改
3. 推断列类型 → `columns[]`
4. Add table → 落盘、侧栏与流程图出现节点

### 4.3 By combining tables

1. 选择左/右输入：Analysis 表，或视图（先按当前转换结果临时物化再连接）
2. Join 类型或 Append（Append 按列名对齐，无需键）
3. Join 时选择连接键（支持多键）；右侧预览
4. 命名 → Add table（`source: combine`，保留输入引用供流程图连线）

### 4.4 从表创建视图

表下 New view → 选择 View Type → 创建子 `ViewNode`；默认数据 = 表过滤后结果，无额外转换。

---

## 5. vxe-table 工作区与类 Excel 编辑

### 5.1 表能力（P0）

| ID | 需求 | 说明 |
| --- | --- | --- |
| T-01 | 配置式列 | 由 schema 生成列 |
| T-02 | 字段元数据 | `field` / `title` / `dataType` |
| T-03 | 行加载 | 当前表/视图结果集 |
| T-04 | 筛选 | 与 tableFilters / viewFilters 持久化同步 |
| T-05 | 排序 | 可持久化 |
| T-06 | 列显隐与顺序 | **隐藏列仍可图表绑定** |
| T-07 | 工具栏 | 新建视图、创建图表、图表位置、导出 CSV |
| T-08 | 空态/加载/错误 | 统一状态 |
| T-20 | **双击编辑** | 双击单元格进入编辑（见 §5.2） |
| T-21 | **类 Excel 编辑** | 见 §5.2 |
| T-22 | **禁止合并单元格** | 不提供 merge、不渲染合并态 |

### 5.2 类 Excel 编辑（新增需求 · 定稿）

目标：在 Analysis 表与「表类型视图」中，提供接近电子表格的编辑体验，便于科学家直接改数。

| 能力 | 要求 |
| --- | --- |
| 进入编辑 | **双击**单元格进入编辑；也可键盘 F2（若与 vxe 快捷键不冲突则启用） |
| 提交/取消 | Enter/失焦提交；Esc 取消 |
| 类型校验 | 按 `dataType` 校验 number/date/boolean；非法输入提示且不写入 |
| 方向键 | 编辑结束后方向键移动选中单元格（对齐常见表格习惯） |
| 复制/粘贴 | 支持选区 Ctrl/Cmd+C / Ctrl/Cmd+V（纯文本/TSV）；粘贴按矩形写入可见列 |
| 填充 | 选区右下角拖拽填充（同值填充为 P0；序列填充为 P1） |
| 增删行 | 工具栏或右键：在下方插入行、删除选中行 |
| 撤销/重做 | 编辑会话内 Undo/Redo（Ctrl/Cmd+Z / Shift+Z）；落盘后仍保留有限栈（建议 ≥20 步） |
| 多选 | 拖选矩形区域；Shift 扩展选区 |
| **不做** | **单元格合并**、拆分、富文本单元格、公式引擎（派生列用转换，不用单元格公式） |

实现要点：优先启用 vxe-table 编辑与剪贴板相关能力并封装统一 `EditableGrid`；与图表刷新联动——行数据变更后防抖重绘当前图。

### 5.3 编辑写回规则

| 当前打开对象 | 编辑写回目标 |
| --- | --- |
| Analysis 表 | 直接写该表 `rows` |
| viewType=table 且无转换 / 转换可逆场景 | **默认**：写回**数据源表**的对应行（通过稳定 `rowId`）；若存在会改变行集形状的转换（过滤后子集、去重、选列导致缺列等），则： |
| 有「改变行身份」的转换时 | 提示「当前视图含转换，编辑将物化并写回视图缓存 / 或请提升为表再编辑」——定稿为：**仅当管道为「恒等或仅排序」时可写回源表；否则编辑禁用并提示提升为表，或提供「物化副本表」一键操作** |

推荐默认体验：

1. **源 Analysis 表**：始终可编辑  
2. **带过滤/转换的视图**：只读 + banner「提升为表后可编辑」或一键物化  
3. **恒等表视图**（无过滤转换）：可编辑并写回源表  

### 5.4 表+图布局

`chartPosition`: top | bottom | left | right（默认 bottom）；分隔条可拖；窄屏左右降级为上下。STYLE 与工作区方位相互独立。

---

## 6. 视图树、过滤、转换、提升

### 6.1 侧栏

- 按表分组，视图多级嵌套
- 搜索、全部展开/折叠、节点旁 + 建子视图
- 菜单：重命名、删除、跳转流程图、提升为 Analysis 表
- 删除需确认并级联子孙

### 6.2 数据管道

```text
父数据（表 rows 或父视图输出）
  → 祖先表 tableFilters
  → 本视图 viewFilters
  → transforms[]（按序）
  → ViewResult { columns, rows }
  → vxe-table / ChartRuntime
```

### 6.3 视图过滤

等于 / 不等于 / 包含 / 为空 / 数值与日期范围；与 vxe 表头筛选为同一套 `viewFilters`。

### 6.4 常用转换（第一期）

| Transform | 行为 |
| --- | --- |
| Select columns | 保留/剔除列 |
| Rename column | 改 title/field（冲突自动后缀） |
| Derived column | 列间四则、常量、`concat`；失败置空 |
| Deduplicate | 按列去重，保留首行 |
| Sort | 多列排序（可与表头排序合一持久化） |

转换步骤可排序/删除；表达式错误则**阻断 Save 并标红该步**。不做任意 SQL、不做节点式流水线画布。

### 6.5 View Type 与提升

- 内联重命名，自动保存
- 切换 View Type：尽量保留可对齐映射，否则清空并提示（unified-charts 11A）
- **提升为表**：将当前 `ViewResult` 物化为新 `AnalysisTable`；原视图保留

---

## 7. 流程图（Vue Flow · 轻量可编辑）

### 7.1 定位

结构可视化与导航；非工作流引擎。

### 7.2 节点与边

| 节点 | 来源 |
| --- | --- |
| Table / Source | `AnalysisTable` |
| View / Chart 卡片 | `ViewNode`（非 table 时可显示 Inputs/Output chart） |

边：表→子视图、视图→子视图、combine 输入→合并表。状态勾选表示有效；依赖错误显示警告。

### 7.3 交互

| 支持 | 不支持 |
| --- | --- |
| 缩放、fit | 画布拖线改拓扑 |
| 拖拽节点，坐标入 `FlowchartLayout` | 画布新建/删节点 |
| **单击节点打开 Workspace** | 画布改 Join/转换 |
| 侧栏跳转定位 | — |

提示条文案：「修改分析结构请从侧栏进行；画布仅支持拖拽布局」。

新技术：**@vue-flow/core**；节点/边由 store 计算属性生成，与侧栏一致。

---

## 8. 图表 Runtime（ECharts × unified-charts 全量）

### 8.1 模块

| 模块 | 职责 |
| --- | --- |
| ChartEntry | 创建图、View Type、chartPosition |
| ChartConfigurePanel | CONFIGURE |
| ChartStylePanel | STYLE |
| ChartRuntime | ViewResult + config → ECharts option |
| FitEngine | PtP / Linear / Quadratic / 4PL |
| LassoFlagging | 套索 Flag/Clear；Exclude flagged |
| ModelTablesPanel | MODEL VARIABLES / OUTPUT |
| ChartExport | PNG / PDF |

文档中的 Apply 映射为工作区 **Save**；Cancel 丢弃侧栏草稿（决议 10C）。

### 8.2 图种

Bar / Box / Line / Pie / Scatter / Heatmap 的 CONFIGURE/STYLE/拟合等以 `docs/features/charts/*.md` 为验收清单。Runtime 用图种注册表挂载，避免巨型分支。

### 8.3 数据与刷新

- 输入对齐 `table-chart-integration` 的 `ChartDataInput`
- 默认过滤全量；`N=10000` 触发采样提示 + 完整数据下载入口
- 过滤/转换/单元格编辑变更 → 防抖重绘；绑定列消失 → 提示并清非法槽位

### 8.4 ECharts 补齐策略

| 能力 | 策略 |
| --- | --- |
| Box | boxplot + 可选点叠加 |
| 拟合 | FitEngine 计算序列后 line series 叠加 |
| 套索 | brush / overlay → flags |
| PDF | PNG 嵌入 PDF（或等价方案） |
| 双 Y | 双 yAxis |

### 8.5 与表视图

- `viewType=table`：仅表区（可编辑规则见 §5.3）
- 图种视图：表+图按 `chartPosition` 并存；同一 ViewNode 切换 viewType

---

## 9. 技术骨架

```text
src/
  app/                 # 路由、布局、Mock 项目
  modules/
    analysis/
    sidebar/
    flowchart/
    table/             # CSV、Join、EditableGrid(vxe)
    transform/
    chart/
  shared/
    db/                # Dexie + Repository
    ui/
  styles/
```

**依赖**：Vue3、Vite、TypeScript、Vue Router、Pinia、Element Plus、vxe-table、@vue-flow/core、echarts、dexie、papaparse（+ PDF 辅助库）。

---

## 10. 错误处理

| 场景 | 行为 |
| --- | --- |
| CSV 解析失败 | 错误提示，不建表 |
| Join 无匹配 | 允许空预览 + 警告 |
| 转换表达式错误 | 阻断 Save，步骤标红 |
| 单元格类型非法 | 不写入，toast |
| IDB 配额不足 | 全局提示 |
| 图表必填缺失 | Save 校验；Runtime 空态 |

---

## 11. 测试与成功标准

### 11.1 测试

- 单元：Join/Append、过滤、转换、FitEngine、采样、粘贴矩形写入
- 组件：侧栏、CSV 对话框、CONFIGURE 校验、双击编辑
- e2e（P1）：创建 Analysis → CSV → 视图 → Bar 图

### 11.2 成功标准

1. Analysis 创建后刷新仍在（IndexedDB）
2. CSV + Combine（含 Append）+ 多级视图树
3. 过滤 + 四类转换 + 提升为表
4. **源表双击编辑、复制粘贴、增删行；无合并单元格**
5. 流程图：自动拓扑、拖位置、跳转、单击打开
6. 六图种按 unified-charts 全量可勾验
7. Registry/Plate/Send output/Connect external 仅占位

---

## 12. 实现切片（交付顺序）

Spec 描述完整目标态；开发按切片推进：

| 切片 | 内容 |
| --- | --- |
| S1 骨架 | Vite 工程、路由、Mock 项目、Analysis CRUD、布局壳、Dexie |
| S2 表 | CSV、Combine、vxe 只读浏览 → **可编辑网格** |
| S3 视图 | 嵌套树、过滤、转换、提升为表、编辑写回规则 |
| S4 流程图 | Vue Flow 轻量可编辑 |
| S5 图表 | ECharts Runtime，按 unified-charts 逐图种补齐至全量 |

---

## 13. 相关文档

| 文档 | 作用 |
| --- | --- |
| 用户上传《Insight analysis 功能说明》 | 产品行为与截图 |
| [`docs/features/charts/`](../features/charts/) | 图表功能唯一依据 |
| [`docs/requirements/table-chart-integration.md`](../requirements/table-chart-integration.md) | 表+图一体化需求 |

---

## 14. 自检记录

- [x] 无 TBD 作为成功路径；采样 N、隐藏列绑定、编辑写回规则已定稿
- [x] 范围 D 与图表全量 C 已用实现切片拆解，避免「必须一次交付」歧义
- [x] 表格编辑需求已写入 §5.2–§5.3；明确禁止合并单元格
- [x] Registry/Plate 等占位与非目标一致
- [x] Apply/Save 命名与 unified-charts 决议对齐
