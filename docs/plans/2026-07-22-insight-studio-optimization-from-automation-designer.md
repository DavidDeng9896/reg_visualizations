# Insight Studio 产品功能优化文档 —— 对标 Benchling Automation Designer（A / B·部分 / D）

> 日期：2026-07-22
> 参考来源：
> - `docs/reference/automation-designer-data-analysis.md` / `automation-designer-custom-code.md`
> - `docs/reference/raw/image-analysis.md`（22 个图片/GIF 逐一视觉解析）
> - `docs/automation-designer-feature-list.md`（完整功能清单）
>
> 现状依据：`insight-studio/DESIGN.md`、`insight-studio/src/shared/types.ts`、`docs/dev/insight-analysis-progress.md`（Round 108，914 单测 / 10 E2E 全绿）
>
> 选型范围（用户指定）：
> - **A** 流程图画布与通用交互 —— 全量
> - **B** 数据源步骤 —— 仅「文件导入」「上传 CSV」「Join/Union」
> - **D** 下游分析步骤 —— 全量，**去掉 Look up 富化**
>
> 明确不纳入：Custom Code（F）、Look up（D 中剔除）、Connect 仪器管线（C）、模板变量（E）、Analysis Template（G）、Run schema（H）。其中 Custom Code 作为远期方向在 §8 简述。

---

## 1. 背景与目标

Insight Studio 当前的流程图是**只读的派生关系可视化**（DESIGN.md §5：「流程图只是浏览/导航/布局，不改拓扑」），数据加工能力依附在视图树上（表级 filters + 视图级 filters/transforms），转换仅 5 种（select / rename / derived / dedupe / sort）。

Benchling Automation Designer 展示的范式是：**流程图即编辑器**——数据加工被建模为画布上的显式步骤（step），每个步骤有类型化输入/输出端口、配置面板、状态机和只读回看；用户通过「拖线 → 选步骤 → 配置」完成管道搭建。

本次优化目标：在**不推翻现有图表系统与视图树**的前提下，把 Insight Studio 的数据加工层从「隐式视图树」升级为「显式步骤管道」，并对齐 Benchling 画布交互质量。核心收益：

1. 数据加工过程**可见、可审、可复用**（每个中间步骤是一个可点击查看的节点，而非埋在视图配置里）；
2. 转换能力从 5 种扩到 10+ 种，覆盖常见 assay 数据整形需求；
3. 文件导入从「单 CSV 弹窗」升级为「多文件源步骤 + 画布内转换链」；
4. 为远期模板化（保存/复用整个管道）打好数据模型基础。

---

## 2. 现状 vs 参考：差距总览

### 2.1 A · 流程图画布与通用交互

| 能力 | Benchling Automation Designer | Insight Studio 现状 | 差距 |
| --- | --- | --- | --- |
| 节点状态机 | ✓ 已配置 / ⚠ 待配置（"Waiting on step input or configuration"）/ spinner 执行中 | 仅绿色对勾一种完成态 | **缺**待配置、执行中状态 |
| 节点端口 | 显式 Inputs / Outputs 分组，每端口带数据类型图标（回形针=文件、表格=dataset、柱状图=chart） | 无端口概念，边为自动派生 | **缺**类型化端口 |
| 加步骤方式 | 从节点输出端口**拖出连线** → 右侧 Add step 目录面板 → 选步骤自动连线 | 不支持（拓扑不可编辑） | **缺**核心交互 |
| 步骤目录面板 | 右侧抽屉，分类分组（Code/Connect/Combine/Create table/Statistics/Transform），顶部搜索，Step descriptions 开关 | 无 | **缺** |
| 步骤配置 | 右侧抽屉式配置面板，Cancel/Next/Save，可展开全屏 | 转换为弹窗（TransformDialog），与画布无关联 | **部分**（有配置 UI，非画布上下文） |
| 配置回看 | 保存后点节点弹**只读**配置摘要（灰底锁定字段） | 无 | **缺** |
| 节点重命名 | 点节点 → 重命名弹窗 | 不支持 | **缺** |
| 连线类型图标 | 连线中点图标指示流动数据类型 | 贝塞尔边无图标 | **缺** |
| 侧栏联动 | ANALYSIS DATA 树 ↔ 画布双向联动高亮 | 已有双向联动高亮 ✅ | 保持 |
| 画布基础 | 点阵背景、缩放控件、适应视图、平移 | 已有（vue-flow）✅ | 保持 |
| 执行反馈 | 步骤执行 spinner + toast 序列（starting/running/completed） | 转换即时计算，无执行态概念 | **缺**（大数据量时需要） |

### 2.2 B · 数据源步骤（限定三项）

| 能力 | Benchling | Insight Studio 现状 | 差距 |
| --- | --- | --- | --- |
| 文件导入 | `Import files from data catalog`：**多文件**导入为一个源步骤，base file name 即节点名；文件在画布上作为一等公民（可接转换步骤） | CsvImportDialog：单 CSV 直接解析成表，无"文件"实体 | **缺**文件实体与多文件导入 |
| 上传 CSV 建表 | 拖拽上传区 + 文件选择器 + 命名，生成表源节点 | 已有 CSV 导入（papaparse），但为弹窗流程、非画布步骤 | **部分**（需步骤化 + 拖拽） |
| Join / Union | `Join tables` / `Union tables` 既是源步骤也是下游步骤，画布显式节点 | CombineTablesDialog 已有 left/inner/right/full + append，物化新表 | **部分**（能力在，未步骤化到画布） |

### 2.3 D · 下游分析步骤（去 Look up）

| Benchling 步骤 | 作用 | Insight Studio 对应 | 差距 |
| --- | --- | --- | --- |
| Filter table | 行过滤 | Filter（表级/视图级）✅ | 需步骤化 |
| Hide columns | 隐藏列 | select transform（keep/drop）✅ | 语义对齐即可 |
| Add computed column | 表达式派生列 | derived transform ✅（+ - * /、concat） | 表达式能力需扩（见 §5.4） |
| Convert column formats | 列类型转换（文本↔数值↔日期） | 无 | **缺** |
| Find and replace text | 列内文本查找替换 | 无 | **缺** |
| Aggregate table | 分组聚合（group by + 聚合函数） | 图表内聚合有，表级聚合**无** | **缺** |
| Bin data | 数值分箱 | 无 | **缺** |
| Pivot table | 透视（行→列） | 无 | **缺** |
| Add window functions | 窗口函数（排名/累计/移动平均等） | 无 | **缺** |
| Format columns | 列显示格式化（小数位/千分位等） | 无（显示层） | **缺** |
| Calculate interpolation | 由标准曲线插值未知样本 | 图表拟合引擎已有 Linear/Quadratic/4PL（`charts/fit/`） | **缺**步骤化；**可复用拟合引擎** |
| Charts | 步骤产出图表 | 视图系统 ✅（六图种，能力强于 Benchling） | 保持优势 |
| Outputs | 定义哪些产物输出 | 无对应概念（本地工具无 Notebook 回写场景） | 暂不需要 |

---

## 3. 总体架构决策（关键）

### 3.1 核心问题：流程图从「视图」变「模型」

当前数据流：`AnalysisTable（含 rows）→ 视图树（filters/transforms 挂在视图上）`，流程图由视图树**推导**。

Benchling 范式：步骤图本身是真相源（source of truth），节点 = 数据加工声明，连线 = 数据流向，产物（表/图/文件）挂在节点输出上。

**建议采用「渐进式双轨」而非一次性重写：**

- **Step graph 成为数据加工的真相源**：新增 `StepNode` 模型（§6.1），转换/合并从视图配置中「提升」为独立步骤节点；视图树的 filters/transforms 保留（图表层的即时探索仍然好用），但**表级加工一律走步骤**。
- **物化策略不变**：每个步骤节点的输出仍是物化的行集（延续现有 combine 物化思路），而非懒求值管道——本地 IndexedDB 场景下物化更简单可靠，且每个节点可直接预览。
- **视图/图表继续挂在任意步骤节点的输出上**（现状是挂在表上；步骤输出表与普通表同构，天然兼容）。

这样既保留视图树的灵活性（图表探索不动），又让加工过程在画布上显式化。

### 3.2 不采用的方案

- **完全懒求值管道**（每次打开视图重算全链）：大数据量下首屏慢，且与现有物化 + 编辑写回模型冲突。保留物化；提供「重新运行」按钮应对上游编辑后的刷新（§5.6）。
- **推翻视图树**：图表系统是当前产品灵魂（DESIGN.md §4），视图级 filter/transform 对图表探索足够好，不动。

---

## 4. 优化方案 A：流程图升级为可编辑画布

### 4.1 节点状态机

新增三态，替换单一绿勾：

| 状态 | 视觉 | 触发 |
| --- | --- | --- |
| 已配置 configured | 浅绿底 `#eefaf3` + 名称右侧绿色对勾圆点（沿用现状） | 配置合法且输出已物化 |
| 待配置 pending | 浅黄底 + 黄色 ⚠ 圆点 + 节点内一行小字 "Waiting on step input or configuration." | 新建未配置 / 必填项缺失 / 上游变更导致配置失效 |
| 执行中 running | 名称右侧 spinner（12px 旋转）+ 节点禁用点击配置 | 物化计算中（>300ms 时显示） |
| 失败 failed（新增，Benchling 有 Custom Code 错误显示在节点上的先例） | 浅红底 + 红色 ! 圆点 | 物化出错（如表达式错误、join 键类型不匹配）；点击节点在详情卡显示错误信息 |

### 4.2 类型化端口与连线

- 节点卡片体部分 **Inputs** / **Outputs** 两组，每端口：类型图标（表格=表/dataset、回形针=文件、柱状图=图表产物）+ 端口名（如 `Output files`、`Left table`、`Dataset`）。
- 连线中点渲染流动数据类型小图标（圆形白底 + 图标，对齐 Benchling 截图）。
- 连线合法性校验：文件端口只能接文件端口、表端口接表端口；不合法时在拖线过程中目标端口置灰 + tooltip 说明。

### 4.3 拖线加步骤（核心交互）

1. 鼠标悬停节点输出端口圆点 → 端口放大高亮，光标变十字；
2. 拖出连线到画布空白处松开 → **右侧滑出 Add step 面板**（340px，与工作区图表配置面板同宽同动效 200ms ease-out）；
3. 面板结构（对齐 Benchling 附件 14 的目录）：
   - 顶部搜索框（模糊匹配步骤名与描述）；
   - 分类分组（本选型范围内）：
     - **Combine tables** → Join tables、Union tables
     - **Statistics** → Calculate interpolation
     - **Transform** → Add computed column、Add window functions、Aggregate table、Bin data、Convert column formats、Filter table、Find and replace text、Format columns、Hide columns、Pivot table
   - 底部 `Step descriptions` 开关（显示/隐藏每项一行灰字说明）；
4. 点选步骤 → 画布 LOADING 占位 → 新节点出现并自动与源端口连线，节点为 pending 态，右侧自动切换为该步骤的配置面板；
5. Esc 或 Cancel → 撤销新节点与连线（对齐 DESIGN.md「可撤销」原则）。

落在已有节点的合法输入端口上松开 = 直接连线（多输入步骤如 Join 的第二输入）。

### 4.4 步骤配置面板（右侧抽屉，取代弹窗）

- 所有步骤配置从现有弹窗（TransformDialog / CombineTablesDialog / FilterDialog）**迁移为右侧抽屉面板**，与图表配置面板同一套壳：顶部步骤名（可编辑=重命名）+ 配置表单 + 底部固定 `Cancel / Save`（dirty 时 Save 亮起）；
- 面板右上角「展开为全屏」图标（大数据预览时有用）；
- 配置变更 **150ms 防抖内在面板内联预览**（显示输出前 50 行 + 行数统计），无需 Save 即可验证效果（对齐 DESIGN.md「即时反馈」最高优先级）；
- Save → 节点进入 running → 物化完成变 configured；校验失败 → 标红字段 + 顶部错误条，不关闭面板。

### 4.5 只读配置回看

- 点击 configured 节点（非编辑入口）→ 弹**只读**配置摘要卡（灰底锁定字段，对齐 Benchling 行为）；
- 卡片右上「Edit」按钮进入 §4.4 编辑态；删除节点入口也在此卡（`⋯` 菜单：Rename / Edit / Delete / Run to here）。

### 4.6 执行反馈与「重新运行」

- 物化 >300ms 显示节点 spinner；>2s 显示全局进度 toast（`Running {步骤名}…` → `{步骤名} completed`）；
- 上游表被**手动编辑写回**后，所有下游节点标记 stale（绿勾变半绿/虚线边框），节点 `⋯` 菜单与画布工具栏提供 **Run / Run all** 重新物化；
- 失败节点阻断下游运行，toast 报错并定位到节点。

### 4.7 保留项

点阵背景、左下缩放控件（− % + ⛶）、拖节点持久化位置到 `flowchartLayout`、侧栏树 ↔ 画布双向高亮、空态 CTA「Add data 开始」——全部保留。

---

## 5. 优化方案 B/D：步骤能力详细设计

### 5.1 B-1 文件实体与多文件导入（Import files）

**现状**：CSV 经 papaparse 直接变表，无文件概念。
**目标**：引入 `AnalysisFile` 实体，文件成为画布一等公民。

数据模型：

```ts
interface AnalysisFile {
  id: string
  name: string          // 文件名（含扩展名）
  sizeBytes: number
  mimeHint: string      // 由扩展名推断：csv/tsv/txt/xlsx/json/unknown
  contentRef: string    // IndexedDB blob 引用（Dexie table 存 Blob）
  importedAt: string
}
```

交互设计：

- **Import files 源步骤**：`+ Add data` → `Import files` → 右侧抽屉：多文件列表（`+ Add files` 打开文件选择器 multiple，或直接**拖入**文件到抽屉的虚线拖拽区）+ `Base file name` 输入框（作为节点名，默认取第一个文件名去扩展名）；
- 节点为**文件源节点**：Outputs: `Output files`（回形针端口，多文件时为端口列表）；
- 点击节点 → 只读摘要卡列出文件清单（名称/大小/导入时间）+ 每个文件的预览（文本类前 20 行）；
- 本地约束（替代 Benchling 的 30MB 限制）：单文件 > 20MB 或解析后 > 200k 行时给警告条，建议先用 Extract/remove lines 或拆分；IndexedDB 配额接近时阻断导入并提示（对齐 DESIGN.md 边界用例 IDB 配额）。

### 5.2 B-1a 文件 → 表转换步骤（Convert file to table）

对齐 Benchling「Convert CSV files to dataset」，作为文件源节点的下游步骤：

- 配置项（右侧抽屉，对齐附件 9 GIF）：
  - `Table name *`（输出表名）
  - `Delimiter` 下拉（Comma / Tab / Semicolon / Pipe / **Custom** → 出现自定义输入框）
  - `Date locale` 下拉（English (US) / ISO / 中文习惯 dd/mm/yyyy…，影响日期解析）
  - `Sheet name`（xlsx 多 sheet 时启用；papaparse 不支持 xlsx，需引入 `xlsx` 库或本期仅 CSV/TSV/TXT，xlsx 列入 P2）
  - `Merge multiple files`（多输入文件时）：同名列**纵向合并（append）**为一张表，附加 `Source file` 列标记来源
- 输出：新 `AnalysisTable`（`source: 'file'`），挂 `Output dataset` 表端口。

### 5.3 B-2 上传 CSV 建表升级

- 现有 CsvImportDialog 保留为快捷入口，同时新增画布路径：`+ Add data` → `Create table from uploaded CSV` → 右侧抽屉：虚线拖拽上传区（云上传图标 + "Drag and drop to upload or Choose a file"）+ `Table name *`；
- 拖拽区接受 `.csv/.tsv/.txt`；上传后内联显示解析预览（前 20 行 + 类型推断结果 `Aa/#` 图标）；
- 生成表源节点直接出现在画布（不再只是侧栏树新增），位置为拖拽区最后点击处或自动布局空位。

### 5.4 B-3 / D Join & Union 步骤化

现有 `CombineSpec`（left/inner/right/full + append）能力完整，优化为画布显式步骤：

- **Join tables 节点**：Inputs: `Left table` + `Right table` 两个表端口；配置面板：Join type 四选一分段控件、Join keys 行编辑器（左列下拉 ⇄ 右列下拉，`+ Add key` 多键）、**冲突列后缀**（`_x/_y` 或自定义，新增能力）、内联预览（匹配行数 / 左未匹配 / 右未匹配 三行统计 + 前 50 行）；
- **Union tables 节点**：Inputs 支持 **2..n** 个表端口（拖多条线到同一节点）；配置：列对齐策略（按名对齐 / 按位置对齐）、缺失列填充 null、`Add source column` 开关；
- 类型不匹配（如 join 键一侧数值一侧文本）在配置面板即警告（不阻断，允许 Convert column formats 先行处理）；
- 删除保护沿用现状：删表前检查 combine 依赖，列出依赖节点。

### 5.5 D Transform 步骤族（现有 5 种 → 10 种）

统一交互骨架：右抽屉 = 步骤名 + 配置表单 + **内联预览（前 50 行 + 行数）** + Cancel/Save。每个步骤一个注册表条目（对齐 DESIGN.md「图种注册表」模式，新建 `src/modules/steps/` 注册表，严禁巨型 if-else）。

| # | 步骤 | 配置项 | 语义/边界 | 优先级 |
| --- | --- | --- | --- | --- |
| 1 | Filter table | 复用现有 Filter（单列多条件 And/Or + 跨列组合），chip 可点编辑 | 与现过滤语义一致；空结果给警告不阻断 | P0（步骤化迁移） |
| 2 | Hide columns | 列多选（keep/drop 双模式） | = 现 select transform 换名对齐 | P0（迁移） |
| 3 | Add computed column | 目标列名 + 表达式编辑器（语法高亮 + 字段自动补全） | 表达式扩展现有 derived：新增 `if(cond,a,b)`、`round(x,n)`、`abs`、`sqrt`、`log`、`ln`、`min/max(a,b)`、日期函数 `year/month/day`；错误阻断保存并标红（沿用） | P0（迁移+增强） |
| 4 | Convert column formats | 列 + 目标类型（Text/Number/Boolean/Date/Datetime）+ 失败值策略（置 null / 保留原值 / 报错） | 解决 join 键类型不齐、CSV 全文本两大痛点 | P0 |
| 5 | Find and replace text | 列 + 查找（plain/regex 开关）+ 替换 + 大小写敏感开关 | 预览面板显示**将受影响行数** | P1 |
| 6 | Aggregate table | Group by 列多选 + 聚合项列表（列 × 函数 count/sum/mean/median/min/max/sd/count distinct）+ 输出列命名模板 | 输出为物化新表；图表聚合逻辑复用 `charts/runtime/aggregate.ts` | P1 |
| 7 | Bin data | 数值列 + 分箱方式（等宽 n 箱 / 自定义边界列表）+ 输出列名 + 标签模板 | 边界解析错误标红 | P1 |
| 8 | Pivot table | 行标识列（多选）+ 透视列 + 值列 + 聚合函数 + 缺失填充 | 透视列 distinct 值 > 50 警告（列爆炸） | P2 |
| 9 | Add window functions | 函数（row_number / rank / dense_rank / cumsum / moving_avg(k) / pct_of_total）+ partition by + order by | moving_avg 需窗口大小 k；排序键必填 | P2 |
| 10 | Format columns | 列 + 小数位 / 千分位 / 百分比 / 科学计数法 | **显示层格式**，不改底层值（存 ColumnMeta.display） | P2 |

> 现有 dedupe / sort / rename 保留：dedupe、sort 纳入步骤族（P1），rename 并入 Hide columns 面板的列行内编辑（或独立 Rename columns，P1）。

### 5.6 D Statistics：Calculate interpolation

**这是与现有资产复用度最高的一步**：`charts/fit/engine.ts` 已有 Linear/Quadratic/4PL 拟合。

- 场景：标准曲线已知（标准品浓度 ↔ 信号），插值未知样本浓度——assay 分析高频需求。
- 配置面板：
  - `Standard curve`：X 列（浓度）+ Y 列（信号）来源（本表内列 / 另一节点表）
  - `Model`：Linear / Quadratic / 4PL（复用拟合引擎；4PL 支持 min/max 约束、显示参数 CI）
  - `Interpolate`：待插值信号列 → 输出新列 `{name} (interpolated)`
  - 拟合优度展示：R²、参数表（Min/Max/Hill Slope/Inflection Point）内联显示
- 输出：物化表 = 输入表 + 插值列；同时产出**可选图表产物**（标准曲线 + 拟合线 + 未知点），作为节点的 chart 端口输出，可直接 `+ New view` 打开。
- 超出标准曲线范围的插值行：值照常给出但加 `Extrapolated` 布尔列标记（对齐"exclude flagged"思想）。

### 5.7 产物视图与 ANALYSIS DATA 树

- 每个物化步骤的输出 = 一张普通 `AnalysisTable`，侧栏 ANALYSIS DATA 树显示为节点子项（表格图标）；图表产物（interpolation 曲线图、图表视图）为图表图标；文件为回形针图标——三类图标与端口图标体系统一；
- `+ New view` 沿用现状（挂到任意步骤输出表上）；
- 树节点与画布节点**同一 id 空间**，天然双向联动。

---

## 6. 数据模型变更

### 6.1 新增 StepNode

```ts
export type StepType =
  | 'import-files' | 'file-to-table' | 'upload-csv'          // 源
  | 'join' | 'union'                                        // combine
  | 'filter' | 'hide-columns' | 'computed-column'
  | 'convert-formats' | 'find-replace' | 'aggregate'
  | 'bin' | 'pivot' | 'window' | 'format-columns'
  | 'dedupe' | 'sort'                                       // 迁移保留
  | 'interpolation'                                         // statistics

export interface StepNode {
  id: string
  type: StepType
  name: string
  /** 类型化输入：引用上游节点输出端口 */
  inputs: { port: string; from: { nodeId: string; port: string } }[]
  /** 步骤专属配置（各 StepType 一个 interface，注册表管理） */
  config: Record<string, unknown>
  status: 'pending' | 'configured' | 'running' | 'failed' | 'stale'
  error?: string
  /** 物化输出（表步骤 → tableId；文件源 → fileIds；图表产物 → viewId） */
  output: { tables: string[]; files: string[]; views: string[] }
}

// Analysis 扩展
interface Analysis {
  // ...现有字段
  steps: StepNode[]                     // 新增：步骤图（真相源）
  files: AnalysisFile[]                 // 新增：文件实体
}
```

迁移策略：现有 `source: 'csv' | 'combine'` 的表在首次打开时**自动迁移**为等价步骤链（csv 表 → upload-csv 步骤；combine 表 → join/union 步骤），迁移幂等，失败回退旧路径。

### 6.2 与视图树的关系

- `AnalysisTable.views` 不变；步骤输出表与普通表同构，视图/图表无需感知步骤层；
- 视图级 filters/transforms 保留（图表探索），文档中明确分工：**"步骤 = 数据加工；视图 = 呈现与探索"**。

---

## 7. 分期 Roadmap 与验收

### P0 —— 画布编辑骨架 + 核心迁移（对齐 Round 节奏，约 3 个合并周期）

1. StepNode 模型 + 旧数据自动迁移 + 单测（迁移幂等、等价性）
2. 画布：节点三态（pending/configured/running）、类型化端口与连线图标、拖线加步骤、Add step 目录面板（搜索/分类/descriptions 开关）
3. 右抽屉配置壳（复用图表面板壳）+ Filter/Hide columns/Computed column 三步骤迁移
4. Join/Union 步骤化（含 Union 多输入、join 匹配统计预览）
5. 验收：E2E 主流程改写为「上传 CSV → 拖线加 Filter → 拖线加 Join → 建图表」；旧 914 单测全绿 + 新增步骤族单测

### P1 —— 文件与转换扩充

1. AnalysisFile 实体 + Import files 多文件源步骤 + Convert file to table（含多文件 append）
2. 上传 CSV 拖拽抽屉
3. Convert column formats / Find and replace / Aggregate table / Bin data
4. 节点 stale + Run / Run all 重新物化；执行 toast 序列
5. 验收：多文件导入→合并→聚合全链 E2E；20MB 警告与 IDB 配额边界用例

### P2 —— 高级步骤与打磨

1. Pivot / Window / Format columns / Dedupe / Sort 步骤
2. Calculate interpolation（复用 fit 引擎 + 标准曲线图产物）
3. xlsx 支持评估（引入 SheetJS 或放弃并文档化）
4. 只读配置回看卡全步骤覆盖；失败态 UI
5. 验收：4PL 插值已知答案用例（复用拟合测试基座）；全量单测 + E2E + build 三绿

### 全程质量要求（沿用 DESIGN.md §0/§7）

- 每模块随单测（步骤语义、迁移、连线校验、表达式引擎、join 统计）；UI E2E（Playwright）覆盖新主流程
- 150ms 防抖内联预览、Esc/Cancel 撤销链、150–250ms 面板动效、键盘可达、空态引导、虚拟滚动与采样警告
- `npm run build` / `npm test` / `npm run test:e2e:ui` 全绿才算完成

---

## 8. 远期方向（本期不做，仅记录）

- **Custom Code（Python/JS 沙箱）**：本地纯前端可考虑 Web Worker 内运行受信 JS 表达式（已部分体现在 computed column），完整 Python（Pyodide）体积与性能代价大，待真实用户需求验证；
- **模板化**（把步骤图存为可复用 Template + 运行时参数）：StepNode 模型已为此铺路（config 与数据引用分离），待 P2 后评估；
- **Outputs/协作回写**：本地单机工具暂无对应场景；
- **Look up / Registry 富化、Connect 仪器管线、Run schema**：依赖 Benchling 平台生态，不适用。

---

## 9. 风险与开放问题

1. **双轨一致性**：视图级 filter/transform 与步骤级并存，需文档与 UI 文案明确分工，避免用户困惑「我的过滤到底在哪一层」——建议表级加工入口统一引导到画布；
2. **物化存储膨胀**：每个中间步骤一份物化表，大表多步骤下 IndexedDB 压力上升 → P1 增加「步骤输出行数上限 + 配额监控」，必要时引入输出压缩或仅存 schema+重算；
3. **迁移回归面**：旧分析自动迁移是最大回归风险，P0 需把迁移单测覆盖率做到全分支；
4. **Interpolation 的 X/Y 跨节点引用**：配置 UI 需支持选择另一节点输出表的列，引用失效（上游被删）时节点置 pending 并明确提示。
