# Insight Studio — 设计纲领（新实现）

> 本项目是对 `../docs` 需求的**全新实现**。功能验收以 `../docs/features/charts/` 与
> `../docs/requirements/table-chart-integration.md` 为唯一依据；架构参考
> `../docs/specs/2026-07-16-insight-analysis-framework-design.md`。
> **禁止**阅读或复制 `../src`、`../tests` 下的旧实现代码。
> 视觉与交互以 Benchling Analysis 截图（`../.ref/benchling/*.png`）为参照，质量对标一流 SaaS（Linear / Notion / Figma 级流畅度）。

## 0. 交互质量总原则（最高优先级）

1. **即时反馈**：一切配置变更 150ms 防抖内实时预览；不需要"应用"按钮才看到效果。
2. **可撤销**：文本编辑、过滤/转换、图表配置均有 Cancel 恢复；表格编辑有 Undo/Redo（Ctrl/Cmd+Z / Shift+Z）。
3. **动效克制而顺滑**：面板开合、tab 切换、弹窗用 150–250ms ease-out 过渡；布局变化用 FLIP/高度动画，杜绝跳变。
4. **键盘可达**：Esc 关闭弹层、Enter 提交、Tab 顺序合理、焦点环可见、下拉支持方向键。
5. **状态可见**：加载骨架、空态引导（带 CTA）、错误 toast、未保存标记（dirty dot）、采样警告条。
6. **不丢状态**：切换图种/布局/视图时保留可复用的映射与样式；路由切换不重置工作区。
7. **大图性能**：表格虚拟滚动；图表超 10000 行采样 + 警告条 + 完整数据下载入口；ECharts 增量渲染、大数据时关闭动画。

## 1. 技术选型（锁定）

- Vite + Vue 3 (`<script setup lang="ts">`) + TypeScript strict
- Pinia（分析文档 store）+ Vue Router（`/` 列表、`/analysis/:id` 工作区）
- **ECharts 5**（按需引入 echarts/core）— 图表引擎
- **@vue-flow/core**（+ Background / Controls / MiniMap）— 流程图
- **vxe-table** — 表格底座（虚拟滚动、列筛选/排序/显隐）
- Dexie (IndexedDB) 持久化，DB 名 `insight-studio`，Repository 接口预留换 HTTP
- papaparse（CSV）、jspdf（PDF 导出 = PNG 嵌入）
- Vitest + @vue/test-utils + fake-indexeddb（单测）；Playwright（UI E2E）
- **不引 UI 组件库**：全部 UI 原语手写（按钮/下拉/弹窗/Tabs/Toast/Tooltip/Slider/ColorPicker），
  保证视觉与动效完全可控、贴合 Benchling 风格。

## 2. 视觉语言（从 Benchling 截图提炼）

- 主色：深蓝主按钮 `#1e2a78`（hover 稍亮），链接/强调蓝 `#2e5bff`，成功绿 `#1f9d66`，警告黄底条 `#fdf3d7`+`#8a6d1a`。
- 背景：页面 `#f7f8fa`，卡片白底 + `1px #e4e7ec` 边框 + `border-radius:8px` + 极浅阴影。
- 字体：系统栈；标题 13–14px/600，正文 13px，辅助 12px `#667085`。
- **类型图标**：字段名前固定小标 `Aa`（分类/文本，灰色）与 `#`（数值，灰色），表格表头与图表字段胶囊一致使用。
- 节点/胶囊：圆角小胶囊（字段胶囊浅灰底、可点 × 删除、可展开设置齿轮 ⚙）。
- 流程图：点阵背景（dot grid），节点为浅绿底（`#eefaf3`）圆角卡片 + 左侧类型图标 + 名称 + 右侧绿色对勾圆点，贝塞尔曲线连接，左下角缩放控件（− % + ⛶），选中节点右侧滑出 Inputs/Outputs 详情卡。

## 3. 应用结构

```
/                       Analysis 列表页（卡片/列表、新建、重命名、删除、按更新时间排序）
/analysis/:id           工作区：顶栏（面包屑 + ⋯ + Flowchart 切换 + Add data 主按钮）
                        左侧栏（Search + ANALYSIS DATA 树 + 底部 Connect 占位）
                        主区（Workspace 模式 / Flowchart 模式）
```

工作区主区在**表视图**与**流程图**之间切换；流程图只是浏览/导航/布局，不改拓扑。

### 数据模型（与 docs/specs §3 一致）

```
Analysis { id, name, createdAt, updatedAt, tables: AnalysisTable[], flowchartLayout: Record<nodeId,{x,y}> }
AnalysisTable { id, name, source: 'csv'|'combine', columns: ColumnMeta[], rows: Row[],
                filters: Filter[], views: ViewNode[] }
ViewNode { id, name, type: 'table'|'bar'|'line'|'scatter'|'box'|'pie'|'heatmap',
           filters: Filter[], transforms: Transform[], chart?: ChartConfig, children: ViewNode[] }
```

- 表级 filter 向下作用于所有后代视图；视图不向上写。
- 管道：父数据 → 祖先表 filters → 本视图 filters → transforms 按序 → ViewResult。
- 转换五种：select / rename / derived / dedupe / sort。表达式错误阻断保存并标红。
- 编辑写回：源表始终可编辑；恒等或仅排序的视图可写回源表；其余只读 + banner「提升为表后可编辑」+ 一键物化。
- 删除表前检查 combine 依赖，有依赖则阻止并列出。
- Combine（join: left/inner/right/full + append）与"提升为表"物化新 AnalysisTable。

## 4. 图表系统（本项目灵魂，投入最多打磨）

### 4.1 布局与心智（对齐截图 06/07/04）

- 视图卡片：标题栏（视图名 + ⋯ 菜单）+ 内容区；图表视图进入编辑态时**右侧滑出配置面板**（宽约 340px），
  主图区同步收缩，动效 200ms。
- 配置面板结构（自上而下）：
  1. 视图名输入框 + Saved/dirty 状态
  2. **Chart type** 下拉（带图种图标，六图互切，可复用映射保留）
  3. **CONFIGURE / STYLE** 两个 Tab（下划线指示器滑动切换）
  4. CONFIGURE：各映射槽位（X-axis / Y-axis / Series / Color / Shape / Size / Categories / Measure / Values…）
     - 槽位内是**字段胶囊**：`Aa/#` 图标 + 名称 + 右侧齿轮（弹轴设置 popover）+ × 移除
     - 聚合胶囊显示如 `Average of Concentration`；点齿轮改聚合/轴 Range(Auto/Manual)/Scale(Linear/Log)/Custom label
     - X⇄Y 一键交换按钮
  5. **FILTERS & TRANSFORMS ＋** 区（chip 列表，点击 chip 再编辑）
  6. 底部固定 **Cancel / Save**（Save 主按钮深蓝；dirty 时 Save 亮起）
- STYLE Tab：分节（General / X-Axis / Y-Axis(/Left/Right) / Legend / Series colors），用对齐的表单行。

### 4.2 共用能力 vs 图种专属（务必区分，验收见 docs/features/charts/*.md）

共用（六图）：View Type 互切；Color palette（Light/Dark/Alternate 等 ≥3 套，CONFIGURE 内选）；
Title/Subtitle；Width/Height/Margins；Opacity；Legend（显隐/位置/自定义标签）；逐系列颜色覆盖；
悬停导出 PNG/PDF；采样警告条。

专属速查：
- **Bar**：X*（分类）+ Y（度量可空=Count）+ Series；方向 竖/横；并排/堆叠；聚合 6 种（Mean 才开误差棒 SD/SEM）；Bar 专属样式（Opacity/Line Width/Line Color/Fill palette）
- **Line**：X*+Y*+Series；**双 Y 轴**（系列切左右轴，STYLE 分 Left/Right 栏）；拟合套件；分面 One/OnePerMeasure；**无误差棒**；点形状/默认色
- **Scatter**：X*+Y*+Color/Shape/**Size(第三数值)**；双 Y；误差棒；拟合套件；Jitter；点大小/形状；分面
- **Box**：Y*（仅 Y 可单箱）+ Categories + Color/Shape；Show Points（全部/仅离群/无）；须=1.5×IQR；Y 轴 Log；**无 Jitter**
- **Pie**：Categories*（默认 Count，空值=`[Blank]`）+ 可选 Measure+聚合；Inner/Outer Radius %（Donut）；Show %；Hide % < 阈值（默认 5）；负值剔除提示；无轴 Tab
- **Heatmap**：X 列坐标 + Y 行坐标 + 连续色值列；连续色阶图例 + 位置；格内数值标注开关（默认关）；行列排序（标签/均值/度量）+ 可选层次聚类；hover 行列坐标+精确值
- 误差棒仅 Bar/Scatter/Box；拟合仅 Line/Scatter；Series 仅 Bar/Line，Scatter/Box 用 Color+Shape（Shape 约 5 种系统形状）

### 4.3 拟合 / 打标 / MODEL TABLES（Line & Scatter）

- CONFIGURE 内 **REGRESSION** 区（截图 07）：Regression model 下拉（None/Point-to-Point/Linear/Quadratic/4PL）、
  Weights（默认等权）、4PL Constraints（min/max 可选）、**Exclude flagged** 开关
- 4PL：可选渐近线显示；参数 = Min/Max/Hill Slope/Inflection Point + CI
- 有 Series/Color 时**每组分别拟合**；悬停拟合线显示统计量 tooltip
- **套索打标**（截图 11/12 + Visual Flagging.gif 笔记）：图表进入 Flag 模式 → 套索选点 → 弹出 comment 必填框 →
  点显示 ×；Clear 模式反向清除；打标存于视图（rowId + comment）
- 图表下方 **Tab 栏**：SOURCE TABLE / MODEL OUTPUT TABLE（X, Y, Y pred, Residual）/ MODEL VARIABLES（参数 + CI），
  表格卡带标题「{视图名} | Model output」与放大/⋯按钮（截图 09）

### 4.4 采样与空态

- 管道结果 > 10000 行：随机采样 10000 + 黄色警告条「Showing a random sample of 10000 rows out of N」+ Download 链接（截图 07）
- 必填映射缺失：图表区空态引导（"选择 X 轴字段开始"），Save 时校验并高亮缺失槽位

## 5. 流程图（Flowchart，对齐 GIF 拆帧）

- 节点来源：Analysis 中所有表/视图/合并步骤；边 = 派生关系（自动推导，不可手改）
- 节点卡：浅绿底 + 类型图标 + 名称 + 绿色对勾；合并步骤为小型连接节点
- 交互：拖节点改位置（持久化到 flowchartLayout）、滚轮缩放、拖空白平移、左下缩放控件 + 适应视图、
  点节点选中（高亮 + 右侧 Inputs/Outputs 详情）→ 双击或按钮跳回工作区打开该视图
- 顶部黄色 BETA 提示条（可关闭）；与侧栏树双向联动高亮
- 空态：居中 CTA「Add data 开始」

## 6. 表格（vxe-table）

- 列头：`Aa/#` 类型图标 + 名称；列菜单（筛选/排序/隐藏）；工具栏（创建图表、列显隐、导出 CSV）
- 编辑：双击进编辑、Tab/Enter 导航、Ctrl+C/V 多单元格粘贴、行增删、Undo/Redo；**禁止合并单元格**
- 行选择 checkbox 列（为打标/后续联动预留）
- 过滤：「+ Add filter」蓝色链接 → 弹窗（单列多条件 And/Or）（截图 14）；过滤 chip 可点编辑
- 表+图布局：`chartPosition: top|bottom|left|right`（默认 bottom）+ 分隔条拖拽（记住比例）+ 窄屏左右自动降级上下

## 7. 工程与测试要求

- 每个模块随带单测：管道/转换、join、拟合引擎（Linear/Quadratic/4PL 已知答案用例）、聚合/误差棒、采样、配置→option 映射
- UI E2E（Playwright）：主流程（建 Analysis→导入 CSV→建视图→配图表→拟合→打标→导出→流程图导航→刷新持久化）
- 边界用例：空 CSV、单列、全空列、负值 Pie、Log 轴非正值、单行拟合、10001 行采样、IDB 配额
- `npm run build`、`npm test`、`npm run test:e2e` 必须全绿才算完成
- 代码组织：`src/shared`（types/db/utils）、`src/ui`（手写 UI 原语）、`src/modules/{analyses,workspace,table,charts,flowchart}`；
  图表按**图种注册表**组织（每图种一个文件：schema/defaults/option-builder/panel-sections），严禁巨型 if-else
