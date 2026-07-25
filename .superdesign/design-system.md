# Insight Studio — Design System

> 适用项目：`insight-studio/`（仓库根目录的 `src/`、`tests/` 是旧实验代码，已废弃，**不要参考**——`insight-studio/DESIGN.md` 明确禁止）。
> 配套机器可读上下文：`.superdesign/init/{components,layouts,routes,theme,pages}.md`（含全部原语/布局/token 的真实源码）。

## 1. 产品上下文

**Insight Studio** 是一个面向科学数据的轻量分析工具（对标 Benchling Analysis）：用户导入 CSV 或合并（Join/Append）数据表，在表上派生过滤/转换管道，并对视图配置六类图表（Bar / Line / Scatter / Box / Pie / Heatmap），支持回归拟合（Linear/Quadratic/4PL）、套索打标、模型输出表，以及展示派生关系的流程图。数据经 Dexie(IndexedDB) 本地持久化。

核心页面与用户流程：

1. **Projects 列表页（`/`）**：卡片网格管理 Analysis（新建/重命名/删除/一键 Demo）。
2. **工作区（`/analysis/:id`）**：顶栏（面包屑 + Add data）+ 左侧 ANALYSIS DATA 树（表 → 视图层级）+ 主区。
3. **表+图工作区**：DataGrid（vxe-table，可编辑/筛选/转换）与图表区按 `top/bottom/left/right` 分栏（可拖拽）。
4. **图表配置**：图表编辑态右侧滑出 ~340px 配置面板——Chart type 无框下拉、CONFIGURE（映射槽位 + 字段胶囊 + FILTERS & TRANSFORMS + REGRESSION）/ STYLE 两个 Tab、底部固定 Cancel/Save。
5. **流程图模式**：@vue-flow 画布浏览表/视图/合并步骤的派生关系，拖节点布局、双击跳回工作区。

## 2. 当前视觉规范（从 `src/styles/tokens.css` 与 `src/ui/*` 提炼）

**原则**：克制的中性灰界面 + 单一品牌强调色；信息密度高、字号小、控件紧凑。

### 颜色
- 主按钮深蓝 `--is-primary: #1e2a78`（hover `#27359a` / active `#182160`）。
- 强调蓝 `--is-accent: #2e5bff` —— 链接、聚焦边框、选中态、开关/滑杆填充；软底 `--is-accent-soft: #eef2ff`。
- 语义色：成功 `#1f9d66`、危险 `#d92d20`、警告条 `#fdf3d7` + `#8a6d1a`。
- 中性阶梯：页面底 `#f7f8fa` → 卡片 `#fff` → hover `#f2f4f7`；边框 `#e4e7ec`（弱）/`#d0d5dd`（强）；文字 `#1d2939` / `#667085` / `#98a2b3`。
- 图表预设色板 16 色（`src/ui/colors.ts` `PRESET_COLORS`），首色即强调蓝。

### 排版
- 系统字体栈（中文 PingFang SC/微软雅黑）；等宽栈用于 hex/参数。
- 字号仅四档：**12 / 13 / 14 / 16px**；正文 13px，标题 14px/600，页面标题 16px/600，辅助 12px。
- 区块小标题：11px / 600 / 大写 / `letter-spacing .05em` / 三级灰（如 CONFIGURE、ANALYSIS DATA）。

### 尺寸 / 圆角 / 阴影
- 控件高度统一：**md 32px / sm 28px**（按钮、输入框、下拉一致）；侧栏树行高 28–30px。
- 圆角：控件 6px、卡片/浮层 8px、弹窗 12px、chip/开关全圆角。
- 阴影三级：卡片 `sm` → 浮层 `md` → 弹窗 `lg`；聚焦环 `0 0 0 3px rgba(46,91,255,.22)`（输入控件内用 2px 窄环）。

### 组件约定
- 自研原语层 `src/ui/`（`I` 前缀，17 个组件），无第三方 UI 库。
- 表单：标签在上、控件在下（`.form-row`：12px/600 灰标签 + 6px 间距）。
- Chart type 切换用 **ISelect 的 `ghost` 无框变体**（文字 + chevron，hover 浅灰底）。
- 字段以**胶囊**呈现：`Aa`/`#` 类型图标 + 名称（可带 `Average of` 聚合前缀）+ 齿轮 + ×。
- 浮层统一 teleport 到 body：白底 + 1px 弱边框 + 8px 圆角 + md 阴影；dropdown(1350) > modal(1300) > popover(1200)。
- 弹窗 footer 右对齐按钮组：取消（secondary）+ 主操作（primary/danger）。

### 动效
- 缓动统一 `--is-ease: cubic-bezier(0.33, 1, 0.68, 1)`。
- 时长三档：**150ms**（hover/颜色过渡）、**200ms**（浮层开合、tab 指示器）、**250ms**（抽屉滑入）。
- 浮层进入：`opacity` + `translateY(-4px)`（select 附加 `scale(.98)`）；抽屉 `translateX(40px)` → 0；toast 右侧滑入。
- 动效克制：仅位置/透明度/颜色，不做弹性/夸张位移；大数据图表关闭动画。

## 3. 目标设计方向（Benchling 风格）

参考 benchling.com 的图表与分析产品：**简洁、干净、专业的科学数据可视化**。

- **配色克制**：大面积中性灰白 + 单一品牌强调色；语义色只用于状态，不做装饰性渐变/彩色卡片。
- **排版层级清晰**：页面标题 16/600 → 面板标题 14/600 → 正文 13 → 辅助 12；大写 11px 小节标题划分区块。
- **配置表单紧凑高效**：标签在上控件在下、行距 8–12px、所有输入控件**统一 32px 高度**（sm 场景 28px）、同类控件等宽对齐。
- **弱边框、轻阴影**：容器用 1px `#e4e7ec` 分隔优先于阴影；只有浮层/弹窗用阴影。
- **无框下拉**切换 chart type；映射槽位用字段胶囊；选择态用 `--is-accent-soft` 浅蓝底而非粗边框。
- 空态必带引导 CTA；危险操作二次确认；所有反馈（保存/dirty/采样警告）可见但不打断。

## 4. 动效约定

| 场景 | 时长 | 属性 |
|---|---|---|
| hover / 颜色 / 边框 | 150ms | color, background, border-color |
| 浮层开合 / Tabs 指示器 | 200ms | opacity + translateY(±4px)，指示器 transform+width |
| 抽屉 / 配置面板滑入 | 250ms | transform |
| Toast 进出 | 200ms | translateX(24px) 入 / translateY(-8px) 出 |

- 一律使用 `--is-ease`；禁用动画处：大数据图表渲染、打印。
- 键盘可达是硬要求：Esc 关浮层、Enter 提交、焦点环可见（`:focus-visible` + `--is-ring`）。

## 5. 已知债（优化时注意）

- `.menu` / `.menu__item` 菜单样式在 `WorkspacePage.vue`、`AnalysisListPage.vue`、`SidebarTree.vue`、`SidebarTreeNode.vue` 各自重复定义，应收敛为共享原语（如 `IMenu`）。
- 少数硬编码色值散落在组件内（tooltip 深底 `#1d2939`、胶囊 hover `#e9edf3`、toast 警告图标 `#e6a817`、IBadge 各色边框），未全部走 token。
- 原语层之外，配置面板等复杂区块的样式写在各自组件内，无跨页面共享的「面板/表单行」布局组件。
