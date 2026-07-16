# 数据表（vxe-table）+ 科学图表 功能需求思考

> 文档性质：独立功能需求文档（第二步）  
> 定位：在 **database 数据表能力** 之上叠加已调研确认的图表能力  
> 表格实现：以 **vxe-table** 作为数据表组件底座  
> 图表能力依据：`doc/product/features/unified-charts/`（LabKey + Benchling 合并定稿）  
> 状态：需求思考稿，供评审后进入方案/实现

---

## 1. 背景与目标

### 1.1 背景

已完成 LabKey / Benchling 图表调研，并合并为统一功能依据（Bar / Box / Line / Pie / Scatter / **Heatmap**；Line/Scatter 含拟合与 MODEL TABLES）。  
第二步需要从产品形态上回答：

> **图表不是独立画板，而是挂在「数据表」之上的可视化能力。**

即：用户先有一张可操作的数据库结果表，再基于当前表数据创建、配置、导出科学图表。

### 1.2 目标

构建「**一张表 + 多种图**」的一体化能力：

1. 用 vxe-table 承载 database 查询结果的浏览、筛选、排序、列管理等表能力；
2. 在表的工具入口上提供六类图表创建与配置（对齐 `doc/product/features/unified-charts`）；
3. 图表消费「当前表视图数据」（含字段元数据 + 行数据），而非脱离表的独立数据集；
4. 保持图表配置能力完整（**CONFIGURE / STYLE**、导出、拟合等已确认项）；
5. **图表相对数据表的显示位置可由用户设置**：上 / 下 / 左 / 右；
6. 图表 Save 写入本工作区配置（与统一图表决议 10C 一致）。

### 1.3 非目标（本阶段不展开）

- 分享/权限体系级的跨用户配置治理（工作区内 Save 需要）；
- 图表内嵌 Developer JS 点击回调；
- Custom code / Plotly 可编程图；
- 独立 Regression 图种（拟合挂在 Line/Scatter）；
- 复杂 BI 多数据集关联、跨表 Join 可视化；
- 替代完整数据库管理平台（DDL/权限/调度等）。

---

## 2. 产品形态总览

### 2.1 推荐信息架构

工具栏之下为「表 + 图」组合工作区；**图表相对数据表的方位由用户配置**（见 §2.3）。

```text
┌─────────────────────────────────────────────────────────┐
│  Dataset / Query 上下文（库表或查询结果）                    │
├─────────────────────────────────────────────────────────┤
│  Toolbar                                                │
│  [列设置] [筛选…] [导出表] │ [创建图表 ▾] [图表位置 ▾] [已创建图表] │
├─────────────────────────────────────────────────────────┤
│  组合工作区（按「图表位置」动态排布）                          │
│                                                         │
│  · position=top/bottom → 纵向：图在上/下，表占剩余高度         │
│  · position=left/right → 横向：图在左/右，表占剩余宽度         │
│                                                         │
│  表区：vxe-table（浏览/筛选/排序/分页）                       │
│  图区：Chart 渲染 + CONFIGURE/STYLE 配置入口                  │
└─────────────────────────────────────────────────────────┘
         │ 当前视图数据（schema + rows）
         ▼
   Chart Runtime（按类型渲染；Line/Scatter 可含拟合与 MODEL TABLES）
```

### 2.2 核心交互原则（对齐统一图表依据）

| 原则 | 说明 |
| --- | --- |
| 表是真相源 | 字段列表、行集合来自当前表视图 |
| 图是表的投影 | 图表绑定列必须来自当前表列；数据取自当前过滤/排序后的可见数据集（或明确约定的数据范围） |
| 配置分两层 | **CONFIGURE**（数据映射/拟合）与 **STYLE**（外观布局）分离，与 `unified-charts` 一致 |
| 表能力用 vxe | 筛选、排序、列显隐、虚拟滚动等优先用 vxe-table 原生能力，不在图表内重复造「表筛选器」 |
| 图位可配 | **图表显示位置相对 database 表可设为上 / 下 / 左 / 右**（取代源产品 SPLIT 单独概念） |

### 2.3 图表显示位置（已确认）

用户可设置图表相对 **database 数据表（vxe-table）** 的摆放方位。

| 位置值 | 布局效果 | 说明 |
| --- | --- | --- |
| `top` | 图在上、表在下 | 纵向分栏；适合先看趋势再查明细 |
| `bottom` | 表在上、图在下 | 纵向分栏；适合以表为主、图为辅（建议默认） |
| `left` | 图在左、表在右 | 横向分栏；适合宽屏对照 |
| `right` | 表在左、图在右 | 横向分栏；适合表为主、右侧看图 |

**需求细则：**

| ID | 需求 | 说明 |
| --- | --- | --- |
| L-01 | 方位四选一 | 提供上/下/左/右设置入口（工具栏「图表位置」或图区设置） |
| L-02 | 即时生效 | 切换位置后组合工作区立即重排，表状态（筛选/排序/滚动）与图配置不丢失 |
| L-03 | 无图时行为 | 尚未创建/显示图表时，表可占满工作区；创建图后按当前方位排布 |
| L-04 | 分隔与尺寸 | 表/图之间支持分隔条拖拽调整占比；可选记住上次比例（P1） |
| L-05 | 响应式兜底 | 窄屏下左右布局可自动降级为上下（需提示），避免表/图不可用 |
| L-06 | 与 STYLE 区分 | 「图表位置」是**相对数据表的工作区布局**；STYLE 仍是图内部标题/边距/色板等，二者独立 |

示意：

```text
 bottom（默认示例）          right（示例）
┌──────────────┐         ┌─────────┬────────┐
│    数据表     │         │  数据表  │  图表  │
├──────────────┤         │         │        │
│    图表      │         └─────────┴────────┘
└──────────────┘
```

> 说明：前期图表功能点未勾选「数据过滤联动」，是指**不在图表配置面板内再做一套过滤 UI**。  
> 本需求改为：**过滤由数据表完成，图表默认消费表当前结果集**。这是表+图一体化后的合理落点。

---

## 3. 数据表底座需求（vxe-table）

### 3.1 为什么选 vxe-table

| 诉求 | vxe-table 对应能力 |
| --- | --- |
| 大数据量查询结果 | 虚拟滚动 / 高性能渲染 |
| 科学数据浏览 | 排序、筛选、列宽、固定列、格式化 |
| 作为图表字段池 | 列配置可导出 field / title / 类型元数据 |
| 工具栏扩展 | toolbar / 自定义按钮，便于挂「创建图表」 |
| 导出 | 表导出能力可与图导出（PDF/PNG）并存 |

### 3.2 表功能需求清单（P0 / P1）

#### P0（图表上线最低表能力）

| ID | 需求 | 说明 | 与图表关系 |
| --- | --- | --- | --- |
| T-01 | 配置式列渲染 | 根据 database schema / 查询字段生成列 | 图表 Columns 列表同源 |
| T-02 | 字段元数据 | 每列至少含：`field`、`title`、`dataType`（string/number/date/boolean/…） | 决定可拖入 X/Y/Categories/Color… |
| T-03 | 行数据加载 | 支持前端全量或分页/懒加载；需定义图表取数策略 | 见 §5 |
| T-04 | 列筛选 | vxe 列筛选（等于/包含/空值等） | 改变图表输入行集 |
| T-05 | 列排序 | 单列/多列排序 | 影响表展示；图通常按绑定逻辑聚合，不直接依赖行序（除 Line 原始序列场景需明确） |
| T-06 | 列显隐与顺序 | 自定义列 | **建议：隐藏列仍可绑定图表**或「仅可见列可绑定」二选一（待决） |
| T-07 | 工具栏入口 | 「创建图表」按钮 + 图表类型菜单 | 打开 CONFIGURE 侧栏 / 创建对话框 |
| T-08 | 空态/加载/错误 | 无数据、加载中、查询失败 | 图同步禁用或提示 |

#### P1（增强体验）

| ID | 需求 | 说明 | 与图表关系 |
| --- | --- | --- | --- |
| T-11 | 虚拟滚动 | 十万级行浏览 | 与「图表取全量过滤结果」策略需配套（见风险） |
| T-12 | 固定列 / 列宽拖拽 | 浏览效率 | 无直接映射 |
| T-13 | 表导出 | CSV/Excel/打印 | 与图 PDF/PNG 并列 |
| T-14 | 行选择 | checkbox 选中子集 | 可选：图表仅基于选中行（增强，非 LabKey 默认） |
| T-15 | 单元格格式化 | 数值精度、日期格式 | 轴标签/Tooltip 显示格式可复用 |
| T-16 | 查询条件区 | 表上方业务筛选（非列头筛选） | 与列筛选共同构成「当前视图」 |

### 3.3 字段类型与图表可绑定角色（关键）

| 字段 dataType | 典型可绑定角色 |
| --- | --- |
| string / enum / boolean | Categories、X Axis Categories、Group By、Series、Color、Shape |
| number | Y Axis、X Axis（Scatter/部分 Line）、聚合度量、第二 Y |
| date / datetime | Line X Axis、部分排序轴 |
| 其他 / 未知 | 默认仅作分类候选或禁止拖入数值槽位 |

需在表 schema 层提供稳定 `dataType`，否则 CONFIGURE 字段校验无法落地。

---

## 4. 图表能力在「表之上」的落位

以下均以 `doc/product/features/unified-charts/*.md` 已确认项为准，只讨论**与表结合时的增量需求**。

### 4.1 图表创建与配置（表上下文）

| ID | 需求 | 说明 |
| --- | --- | --- |
| C-01 | 类型菜单 | Bar / Box / Line / Pie / Scatter / **Heatmap** |
| C-02 | 字段池来源 | CONFIGURE 可选列 = 当前表字段（遵守显隐策略） |
| C-03 | 数据输入 | 默认 = 当前表视图行集；大数据策略见 §5 |
| C-04 | 配置分层 | **CONFIGURE / STYLE**，与 `unified-charts` 一致 |
| C-05 | Save | 图配置写入工作区（决议 10C） |
| C-06 | 导出 | 图：PDF/PNG；与表导出入口分离 |
| C-07 | 图表显示位置 | 上/下/左/右（§2.3）；切换不丢表状态与图配置 |
| C-08 | 拟合 | Line/Scatter：Point-to-Point / Linear / Quadratic / 4PL + 套索打标 + MODEL TABLES |

### 4.2 Bar Charts × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 分类列 | X、Series | string/enum → X / Series |
| 数值列 | Y + 聚合 | number → Y；Count/Sum/Min/Max/Mean/Median |
| 筛选后的行 | 柱高重算 | 表筛选 → 重聚合 |
| — | 水平/堆叠、色板、统计误差棒 | STYLE / CONFIGURE |

### 4.3 Box Plots × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 数值列 | Y | number |
| 分类列 | X / Color / Shape | 分组与点编码 |
| 行数据 | 箱线统计 | 当前行集上计算 |
| — | Show Points / Hover；**无 Jitter** | 纯图交互 |

### 4.4 Line Charts × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 时间/数值 X | X | date/number |
| 数值 Y | Y / 双 Y | 多 number 列 |
| 系列列 | Series | 多折线 |
| — | 对数轴、点形/透明度；拟合四模型 + 打标 + MODEL TABLES | **无** Hide Points / 线宽 / 误差棒 |

### 4.5 Pie Charts × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 分类列 | Categories | Count 或度量聚合 → 扇区 |
| 数值列 | Measure + 聚合 | 非 Count |
| — | 内径、百分比、色板；**无渐变** | STYLE |

### 4.6 Scatter Plots × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 两数值列 | X / Y | number×number |
| 多 Y | 双 Y + 分面 | 多度量 |
| 分类/数值 | Color / Shape / Size | 编码 |
| — | Jitter、统计误差棒、拟合套件；**无密度 Layout** | 过密改用 Heatmap |

### 4.7 Heatmaps × 数据表

| 表侧依赖 | 图表已确认能力 | 结合点 |
| --- | --- | --- |
| 行列坐标列 | X / Y | 分类或整数坐标 |
| 数值列 | 色阶值 | 连续色映射 |
| — | 色阶类型、格内标注、排序/聚类、Hover | STYLE |

---

## 5. 关键数据契约：表视图 → 图表输入
### 5.1 建议的数据对象

```ts
interface TableFieldMeta {
  field: string
  title: string
  dataType: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'unknown'
  // 可选：原始库类型、是否可空、枚举值列表
}

interface ChartDataInput {
  fields: TableFieldMeta[]
  rows: Record<string, unknown>[]  // 当前视图行（或采样/全量策略结果）
  viewState: {
    filters: unknown[]   // 可序列化的表筛选快照
    sorts: unknown[]
    // selectedRowKeys?: string[]  // 若启用「仅选中行」
  }
}

/** 表+图工作区布局（相对 database 表的图表方位） */
type ChartPosition = 'top' | 'bottom' | 'left' | 'right'

interface WorkspaceLayoutState {
  chartPosition: ChartPosition  // 默认建议 'bottom'
  // splitRatio?: number         // 表/图占比 0~1，P1 可记
}
```

### 5.2 图表取数策略（必须拍板）

| 方案 | 描述 | 优点 | 风险 |
| --- | --- | --- | --- |
| A. 当前页 | 只绘当前分页 | 实现简单 | 统计图失真（强烈不推荐作默认） |
| B. 当前过滤全量 | 忽略分页，取筛选后全部行 | 与 LabKey「View Data 过滤后重算」一致 | 大数据内存/性能压力 |
| C. 上限采样 | 过滤全量但超过 N 行采样/聚合下推 | 可扩展 | 需提示用户「已采样」 |
| D. 选中行 | 仅选中行 | 灵活 | 非默认心智，作增强 |

**推荐默认：B**，并设 **安全上限 N**（达到则转 C 并提示）。  
**推荐默认：B**，并设 **安全上限 N**（达到则转 C 并提示）。  
与统一图表「抽样提示」及 Heatmap 大数据场景共用阈值语义。

### 5.3 表变更 → 图刷新策略

| 表事件 | 图行为建议 |
| --- | --- |
| 筛选/排序变化 | 防抖后重取 ChartDataInput 并重绘 |
| 列显隐 | 按 §3.2 待决策略更新 Columns 池 |
| 数据重载 | 重绘；若绑定列已不存在 → 提示并清空非法绑定 |
| 切换查询/表 | 关闭或重置图表配置 |

---

## 6. 页面与模块划分（需求级）

| 模块 | 职责 | 主要依赖 |
| --- | --- | --- |
| DataTableView | vxe-table 展示、筛选排序、工具栏 | vxe-table |
| FieldMetaService | schema → TableFieldMeta | 后端/查询 API |
| WorkspaceLayout | 表+图组合排布；消费 `chartPosition`；分隔条 | — |
| ChartEntry | 「创建图表」菜单、图表位置、已打开图列表 | WorkspaceLayout |
| ChartConfigurePanel | CONFIGURE：映射/聚合/拟合/误差棒 | `unified-charts` |
| ChartStylePanel | STYLE：标题/色板/图例/点样式 | `unified-charts` |
| ChartRenderer | 绘图引擎（待选型） | ChartDataInput + 配置模型 |
| ModelTablesPanel | Line/Scatter：MODEL VARIABLES / OUTPUT | 拟合运行时 |
| ExportService | 表导出 vs 图 PDF/PNG | — |

> 绘图引擎本文件不锁定，需覆盖 `unified-charts` 已确认功能点。

---

## 7. 与统一图表功能点的追溯矩阵

| 图表功能域 | 文档 | 表侧前置 | 一体化增量 |
| --- | --- | --- | --- |
| 共性 CONFIGURE/STYLE | [common.md](../features/unified-charts/common.md) | 字段元数据 | 工作区 Save、chartPosition |
| Bar | [bar-charts.md](../features/unified-charts/bar-charts.md) | 分类/数值 | 视图行聚合、水平/堆叠 |
| Box | [box-plots.md](../features/unified-charts/box-plots.md) | Y + Color/Shape | 分布统计；无 Jitter |
| Line + 拟合 | [line-charts.md](../features/unified-charts/line-charts.md) | X/Y/Series | 拟合/打标/MODEL TABLES |
| Pie | [pie-charts.md](../features/unified-charts/pie-charts.md) | Categories + Measure | 非 Count；无渐变 |
| Scatter + 拟合 | [scatter-plots.md](../features/unified-charts/scatter-plots.md) | X/Y/Color/Shape/Size | 无密度；过密→Heatmap |
| Heatmap | [heatmaps.md](../features/unified-charts/heatmaps.md) | 行列坐标+色值 | 色阶与 Hover |

---

## 8. 优先级建议（实现切片）

### Phase 1 — 表可用 + 一图打通
- vxe-table：T-01～T-08
- 图表：Bar（CONFIGURE + 基础 STYLE + PNG）
- 工作区方位：L-01～L-03
- 数据契约：方案 B + 上限提示

### Phase 2 — 六图 CONFIGURE 齐备 + 四向布局
- Box / Line / Pie / Scatter / Heatmap 的 CONFIGURE 主路径
- Pie 非 Count；Scatter Size；Heatmap 色阶
- PDF/PNG；chartPosition 全量（L-01～L-06）

### Phase 3 — STYLE 与拟合深化
- 各图 STYLE 全量（色板、边距、误差棒、双轴、对数轴等）
- Line/Scatter：拟合四模型、套索打标、MODEL TABLES
- 表 P1：虚拟滚动、选中行绘图（可选）

### Phase 4 — 体验与治理（可选）
- 点→表行联动
- 查询下推聚合
- 多图实例并存策略（见 §9）

---

## 9. 待决问题（需产品确认）

1. **隐藏列能否用于图表绑定？**
2. **图表取数默认 B + 上限 N，N 取多少？**
3. **是否提供「仅选中行绘图」？**
4. ~~Line 非线性范围~~ → **已确认**：Point-to-Point / Linear / Quadratic / 4PL（见 unified-charts）
5. ~~表/图布局~~ → **已确认**：上/下/左/右（§2.3）
6. **是否需要多图表实例并存？** 多图时方位共享还是每图独立？
7. **绘图库选型约束**（导出、双 Y、箱线、4PL、套索）？
8. **左右布局默认宽度比例**、窄屏降级阈值？

---

## 10. 成功标准（验收思路）

1. 用户打开一库表/查询结果，可在 vxe-table 中完成筛选排序浏览。  
2. 从工具栏创建六类图之一，字段池与表列一致，类型校验符合统一细则。  
3. 修改表筛选后，图表随当前视图更新（在约定取数策略内）。  
4. 各图已确认的 CONFIGURE/STYLE/导出/拟合能力可按 `doc/product/features/unified-charts` 逐项勾验。  
5. Pie 可绑定非 Count 度量；Heatmap 可独立创建。  
6. Line/Scatter 可完成拟合、套索打标与 MODEL TABLES 查看。  
7. **用户可将图表位置切换为上/下/左/右，表状态与图配置保持。**

---

## 11. 相关文档

| 文档 | 作用 |
| --- | --- |
| [../features/unified-charts/README.md](../features/unified-charts/README.md) | **当前**图表功能点入口 |
| [../features/charts/](../features/charts/) | LabKey 溯源 |
| [../features/benchling-charts/](../features/benchling-charts/) | Benchling 溯源 |
| [../../reference/labkey/](../../reference/labkey/) | LabKey 参考资料 |
| [../../reference/benchling/](../../reference/benchling/) | Benchling 参考资料 |
| [../../README.md](../../README.md) | 文档中心索引 |

---

## 12. 小结

> **以 vxe-table 为唯一业务数据入口，把 `unified-charts` 已确认的六类图表（含 Line/Scatter 拟合套件）挂到表工具链上，用字段元数据 + 当前视图行集驱动 CONFIGURE/STYLE/导出；图表相对表位置支持上/下/左/右。**

确认 §9 剩余待决后，可进入技术方案与实现计划。
