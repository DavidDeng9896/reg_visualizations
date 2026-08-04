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
- 壳层：全局头部为明度蓝渐变 `#3a80ef→#2062e6`；一级菜单 rail 56px（激活项浅蓝底 `#edf1fe` + 右缘蓝条 `#3c84f1`）；二级侧栏 220px，「看板/分析」分段容器 `#eaecf0`。
- 背景：页面 `#f7f8fa`，卡片白底 + `1px #e4e7ec` 边框 + `border-radius:8px` + 极浅阴影。
- 字体：系统栈；标题 13–14px/600，正文 13px，辅助 12px `#667085`。
- **类型图标**：字段名前固定小标 `Aa`（分类/文本，灰色）与 `#`（数值，灰色），表格表头与图表字段胶囊一致使用。
- 节点/胶囊：圆角小胶囊（字段胶囊浅灰底、可点 × 删除、可展开设置齿轮 ⚙）。
- 流程图：点阵背景（dot grid），节点为浅绿底（`#eefaf3`）圆角卡片 + 左侧类型图标 + 名称 + 右侧绿色对勾圆点，贝塞尔曲线连接，左下角缩放控件（− % + ⛶），选中节点右侧滑出 Inputs/Outputs 详情卡。

## 3. 应用结构

```
全局壳层（AppShell）
├─ 头部 AppHeader：明度蓝渐变（#3a80ef→#2062e6，48px）、白色明度 logo +「科学数据管理」、
│   居中搜索、右侧 通知/全屏/David（全部占位）
├─ 一级菜单 rail（ShellNav，56px）：注册/化合物/合成路线/IP路线/序列/产品/数据分析(固定激活)/设置/审计日志，
│   除数据分析外均为占位；激活态 = 全宽 #edf1fe 底 + 右缘 3px 蓝条
└─ 二级侧栏（ShellSidebar，220px）：顶部「看板/分析」分段切换
    ├─ 看板：搜索 + 新建 + 看板卡片（名称/N 个组件/更新时间，hover ⋯ 重命名·删除）→ 点击切换看板
    ├─ 分析：搜索 + 新建 + 分析卡片（名称/N 张表·M 个视图/更新时间）→ 点击进入下一级
    └─ 分析详情：面包屑「< 分析 / 名称」+ 搜索 + Add data「+」+ 数据流节点树（表/视图）

/                       分析首页（空态引导：New analysis / 一键 Demo；分析列表在左侧二级侧栏）
/dashboards/:id?        看板页：顶栏（看板名 + ⋯ 菜单：分类样式/编辑布局/添加组件）+ 画布（#f9fafb）
/analysis/:id           工作区：顶栏（分析名 + dirty/保存中 + Flowchart 切换 + ⋯）
                        主区（Workspace 模式 / Flowchart 模式）
```

工作区主区在**表视图**与**流程图**之间切换；流程图节点详情为**右侧/下侧固定面板**（不允许浮窗形式）。

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
Title/Subtitle（缺省为空，避免与外层标题重复）；Width/Height/Margins；Opacity；Legend（显隐/位置/自定义标签）；逐系列颜色覆盖；
悬停导出 PNG/PDF；采样警告条；**参考线（X/Y 阈值线 + 标签，Pie 除外）**。
Line/Scatter 专属共用：拟合线型（实线/虚线，默认实线）；**拟合注释（方程 + R² 上屏，开关）**；
**95% 均值置信带（Linear/Quadratic）**；**MODEL TABLES 含 RESIDUAL PLOT（残差散点）与变量表 R²/AUC 行**。

专属速查：
- **Bar**：X*（分类）+ Y（度量可空=Count）+ Series；方向 竖/横；**并排/堆叠/100% 堆叠**；聚合 6 种（Mean 才开误差棒 SD/SEM）；Bar 专属样式（Opacity/Line Width/Line Color/Fill palette/**数据标签**）
- **Line**：X*+Y*+Series；**双 Y 轴**（系列切左右轴，STYLE 分 Left/Right 栏）；拟合套件；分面 One/OnePerMeasure；**无误差棒**；点形状/默认色
- **Scatter**：X*+Y*+Color/Shape/**Size(第三数值)**；双 Y；误差棒；拟合套件；Jitter；点大小/形状；分面
- **Box**：Y*（仅 Y 可单箱）+ Categories + Color/Shape；**形态 Box/Violin**；Show Points（全部/仅离群/无）；须=1.5×IQR；Y 轴 Log；**无 Jitter**
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
- 表+图布局：`chartPosition: top|bottom|left|right`（默认 top，图在上、数据源在下）+ 分隔条拖拽（记住比例）+ 窄屏左右自动降级上下
- 源表显隐：首次进入某图表编辑默认显示数据源；之后再进入默认隐藏（会话内可手动切换）

## 7. 工程与测试要求

- 每个模块随带单测：管道/转换、join、拟合引擎（Linear/Quadratic/4PL 已知答案用例）、聚合/误差棒、采样、配置→option 映射
- UI E2E（Playwright）：主流程（建 Analysis→导入 CSV→建视图→配图表→拟合→打标→导出→流程图导航→刷新持久化）
- 边界用例：空 CSV、单列、全空列、负值 Pie、Log 轴非正值、单行拟合、10001 行采样、IDB 配额
- `npm run build`、`npm test`、`npm run test:e2e` 必须全绿才算完成
- 代码组织：`src/shared`（types/db/utils）、`src/ui`（手写 UI 原语）、`src/modules/{analyses,workspace,table,charts,flowchart}`；
  图表按**图种注册表**组织（每图种一个文件：schema/defaults/option-builder/panel-sections），严禁巨型 if-else

## 8. 性能机制（2026-08 优化）

- **加载链**：ShellSidebar 的导入对话框/数据集树全部 `defineAsyncComponent`（xlsx/alasql/CodeMirror 不进 entry）；
  jspdf 系不做 manualChunks（vendor chunk 会捕获 preload helper 变成首屏静态依赖），靠动态 import 自然分包。
  首屏 eager ≈107KB gzip。测量脚本：`scripts/perf-measure.mjs`（preview + CDP）。
- **图表 builder**：各图种单遍 `Map<key, Row[]>` 分组，禁止「每组 rows.filter」；
  layout-only 变更（标题/副标题/边距）走 `Plotly.relayout` 快路径（<100ms），其余 150ms 防抖全量重建；
  `Plots.resize` 100ms trailing 节流，`responsive:true` 禁用（RO 单通道）；
  采样为数据驱动 seed 的确定性蓄水池（同数据同点集）。
- **看板**：`widgetData` 按 analysisId 持久 promise 缓存 + `saveNow` 失效钩子 + pipeline LRU；
  拖拽期间 body `.is-board-dragging` 挂起图表 RO，松手一次性 resize；
  拖拽手柄键盘可达（方向键步进 1 格、Delete 移除、Esc 取消）。
- **流程图**：`rebuild()` 按内容签名复用未变节点/边对象；高亮刷新只写变化的 class；
  `updateNodeInternals` 仅结构签名变化时调用；>200 节点（perfMode）MiniMap 与边中点图标降级。

## 9. AI 数据分析助手（2026-08 新增）

平台内置 agent：自然语言驱动平台工具完成「建表 → 加工 → 配图 → 看板」全流程。

### 架构（前端 ReAct loop + 后端代理）

```
浏览器（AiDrawer / aiStore）
  │  POST /api/ai/chat（OpenAI chat/completions 负载，stream）
  ▼
insight-api-go /api/ai/*（默认后端；Node `insight-api/src/ai.ts` 为对照）
  ├─ config：data/ai-config.json 服务端存储，GET 只回掩码 Key，PUT 局部更新
  ├─ chat：SSE 原样代理到配置的 OpenAI 兼容端点（Key 不出服务端）；未配置 409 ai_not_configured
  ├─ conversations：会话/消息 CRUD（store.db 的 ai_conversations 表）
  ├─ skills：本机 Skill 包（official seed + 用户 zip），`/api/ai/skills*`
  └─ mcp：SSE/HTTP MCP 连接与代调（headers 掩码），`/api/ai/mcp*`
```

- **ReAct loop 在前端**（`src/modules/ai/agentLoop.ts`）：模型返回 tool_calls → 本地执行 →
  tool 结果回灌 → 再请求，直到纯文本或达到 maxIterations（默认 8）。
  超轮不硬报错：自动追加一轮**无工具收尾请求**（system 提示「直接根据已有结果总结」），
  实在拿不到文本才抛 MaxIterError。
  好处：工具直接操作前端 store（analysisStore/dashboardStore），撤销/持久化/视图刷新全部走现有链路，零后端业务侵入。
- **工具集**（`tools/registry.ts` JSON Schema + `tools/impl.ts` 实现）四组平台工具 + Skills/MCP：
  数据（list/get schema/import_csv）、步骤（filter/join/union/computed/hide/run/rerun_stale）、
  图表（create_view/set_chart_config，写后跑 validateChartMapping 回执校验结果）、看板（建板/加组件）；
  元工具 submit_plan/mark_step_done 驱动进展清单；**`list_skills` / `read_skill`** 读本机 Skill；
  发送前拉取 `GET /api/ai/mcp/tools` 动态合并 MCP function（`mcpTools.ts`），调用走 Go 代发。
  危险操作（删表/视图/步骤）在 confirmDestructive
  开启时先回 `NEEDS_CONFIRMATION`（摘要内含「不要重试、提示用户点确认」指令防模型空转），
  前端确认后带 `__confirmed` 重放。
  源表缺产出步骤时 impl 自动补 upload-csv 源步骤（与 migrateSteps 同构），保证任意分析可挂接下游。
- **Skills / MCP（一期）**：侧栏「+」旁「能力」面板（`CapabilitiesPanel.vue`）管理全局本机配置；
  Skill = `skill.json` + `SKILL.md`（不执行脚本）；MCP = SSE/HTTP + 自定义 Headers（无 stdio/OAuth）。
  对话注入已启用 Skill 目录摘要，细则按需 `read_skill`。
  官方 Skills（`insight-api-go/skills/official/`）：`lab-data-workflow`、`antibody-discovery`、
  `cell-line-development`、`in-vitro-bioassay`、`in-vivo-efficacy`、`chart-best-practices`。
  科学家场景种子：`scientistSeed.ts`；真实模型冒烟：`playwright.scientist-e2e.config.ts`。
- **上下文**：system prompt（`prompts.ts`）+ Skills 目录 + 当前分析/表/视图摘要（`context.ts`），让模型知道「现在打开的是什么」。

### 交互（全局右抽屉 480px，AppHeader sparkle 入口）

- 消息流（无气泡纯文本风）：用户消息右对齐 + 时间戳；助手 markdown（自写轻量渲染：标题/粗体/行内码/代码块/列表/表格）；
  **思考过程卡**（推理模型的 `reasoning_content` 流，流式展开、结束自动折叠，可手动回看）；
  **计划卡**（绿底白勾逐项打勾）、**轨迹卡**（「已处理 N 个操作」纯文本行默认折叠，展开看每步参数/摘要，
  失败标红；待确认操作**始终外露**「等待确认 + 确认执行」按钮并按摘要去重）、
  **产物卡**（表/视图/看板，视图带小图预览，点击 router.push 直达工作区/看板）。
- 输入条（统一圆角盒子，对齐参考交互）：自动增高输入区（≤140px，Enter 发送 / Shift+Enter 换行）+
  工具行（「+」菜单 = 引用上下文 + 快捷指令两组；**模型选择器** = 绿点状态 + 当前模型 + 下拉切换
  `config.models` 备选，选择持久 localStorage 并作为 payload.model 覆盖；深色方块发送/中止按钮）。
  输入时内联触发：敲 `@` 弹过滤引用菜单、行首敲 `/` 弹指令菜单，Enter 选首项（引用成 chip，不占文本）。
- 设置弹窗：Base URL / API Key（掩码回显）/ Model / 备选模型（逗号分隔）/ 最大轮次 / 危险操作确认开关，保存即生效。
- **能力面板**：Skills（导入 zip / 开关 / 预览 / 删用户包）与 MCP（CRUD / Headers / 刷新 tools / 开关）。
- 多会话：历史面板（相对时间 + 删除）+ 新会话，消息持久化在后端 sqlite，刷新不丢；切换前自动落盘当前会话。

### 测试

- 单测 `tests/unit/ai/`：agentLoop（多轮循环/SSE 分片聚合/超轮收尾/执行异常）、impl（真实 store 上
  import/filter/computed/view+config/delete 确认流）、skillsMcp（MCP 工具名合并/resolve、Skill 目录提示、registry）。
- e2e `tests/e2e/ai.spec.ts`：route 拦截 config（含备选模型）+ chat（按 tool 轮次回放编排 SSE，
  与 `scripts/mock-ai.mjs` 同思路）：①全链路 发送 → 进展打勾 → 轨迹 → 思考块 → 模型切换 →
  产物卡直达（URL 带 viewId + 侧栏出现新视图）；②危险确认流 删除需确认 → 按钮外露 → 确认后表真实删除。
- 真实端点验收（qwen3.8-max，Aliyun 兼容模式）：建图+拟合注释 / 导入+过滤+派生列 / 建看板+加组件 /
  删除确认 / 中止重试 / 历史恢复 / @引用 / 模型切换 全通过。
- 联调：`node scripts/mock-ai.mjs 8789` 起 mock 端点，设置里填 `http://127.0.0.1:8789/v1` 即可手测。
- Go：`insight-api-go` 内 `internal/skills`、`internal/mcp` 包测覆盖导入/掩码/刷新代调。