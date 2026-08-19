# Design: Custom Code 科研运行时（包清单 + Python 图 + 空节点清理）

**日期：** 2026-08-19  
**状态：** Approved  
**来源：** AI 深度测试报告（剂量反应 / ADME / ANOVA）；产品确认 Custom Code 为科研引擎。

## 1. 目标与非目标

### 目标

- Custom Code 是科研计算引擎；原生图表画**表**，Python `go.Figure` 画原生图种不够用的图。
- 宣传的 Python 包与本地 / Docker 实际安装一致；health 与 AI 白名单同源。
- `return go.Figure` 后流程图自动长出**只读** Python 图节点；报告与看板可嵌入。
- AI 产生的失败空节点：全部允许则自动删除，请求权限则确认后删除。

### 非目标

- 运行时 `pip install`；`flowkit` / `pycorn` / `allotropy`（有真实数据再加）。
- 把 matplotlib Figure 直接当图节点（须先转 plotly Figure，或 `savefig` 成文件）。
- 改原生 4PL 拟合行为；新增 ANOVA 无代码步骤。
- 删除用户手建节点，或删除「失败但已有实质代码」的步骤。

## 2. 决策记录

| 决策 | 选择 |
|------|------|
| 产品定位 | Custom Code = 科研引擎；图表负责把结果画出来 |
| 预装包 | 单一 `requirements.txt`；本地与 Docker 相同 |
| 第一批包 | 见 §3；flowkit / pycorn 延期 |
| Python 图出现方式 | Custom Code 跑出 `go.Figure` 即自动长出只读节点 |
| 图节点可编辑性 | 无 CONFIGURE / STYLE / 回归；改图只能改代码再跑 |
| 标识 | 数据类型 `go.Figure`，不用名字前缀；`IOData.name` 当标题与稳定键 |
| 报告 / 看板 | v1 均可嵌入，引用稳定 `chartId` |
| 失败空节点 | 仅 AI 创建；权限模式 allow 自动删，ask 一次确认 |

## 3. Worker 包清单

单一文件 `python-worker/requirements.txt`。删除 `requirements-docker.txt`。`start.sh` / `start.cmd` / `install-deps.mjs` / Dockerfile 只装这一份。

**保持不钉主版本（已有）：** fastapi, uvicorn, pandas, numpy, scipy, scikit-learn, plotly, openpyxl, pydantic

**本批钉版本：**

| 包 | 版本 | 用途 |
|----|------|------|
| rdkit | 2024.9.6 | 化学信息学 |
| statsmodels | 0.14.4 | ANOVA / 回归 |
| biopython | 1.86 | 序列 |
| lmfit | 1.3.4 | 4PL/5PL |
| matplotlib | 3.10.3 | 作图（文件或转 plotly） |
| seaborn | 0.13.2 | 统计图 |
| kaleido | 0.2.1 | Plotly 静态导出 |
| pyarrow | 19.0.1 | 列式数据 |

科学白名单（给模板 / AI / 侧栏，不含 fastapi/uvicorn）与上表科学包一致。

`GET /health` 返回 `{ ok, packages: {name: version}, missing: string[] }`。核心科学包缺任一则 `ok: false`。

`ModuleNotFoundError` 时错误信息附带「当前可用包」列表。

前端常量 `PYTHON_SCIENTIFIC_PACKAGES` 与 worker 探测名对齐（`scikit-learn` 而非 `sklearn`）。

## 4. 只读 Python 图节点

### 4.1 稳定 id

```
chartId = `${stepId}::${outputName}`
flowNodeId = `pychart:${chartId}`
```

`applyStepResult` 按 `chartId` 更新 `plotlyJson`，不再按下标 uuid。本次运行未出现的 name 从 `analysis.charts` 与 `step.output.charts` 移除。

### 4.2 流程图

`FlowNodeKind` 增加 `'python-chart'`。从 Custom Code 的 `Output charts` 连到只读节点。布局视同视图（父右侧）。

点击：全幅只读 Plotly（复用 `PlotlyArtifactPreview` / `ChartPanel`）。无 CONFIGURE。不可作为下游步骤输入源。`resolveStepSourceRef` 对 python-chart 返回 null。

删除：不提供独立删除；生命周期绑定 Custom Code 输出。

### 4.3 报告

`ReportSection` 增加可选 `chartId`。`kind: 'chart'` 时：

- 有 `chartId` → 只读 Python 图
- 有 `tableId` + `viewId` → 原生图

PDF 仍前端截静态图。脚手架把 `analysis.charts` 与原生图一并列入关键发现。

### 4.4 看板

`DashboardWidgetType` 增加 `'python-chart'`。`DashboardWidgetRef.chartId` 可选；python-chart 不要求 `tableId`。

添加组件树可挑选 Python 图。AI `add_dashboard_widget` 支持 `chartId`（此时 `tableId` 可省略）。

源分析重跑后按 `updatedAt` 刷新。缺图显示占位，不打挂整页。

## 5. AI 失败空节点清理

步骤由 AI 工具创建时写入 `config.__createdBy = 'ai'`。

**失败空节点：** `__createdBy === 'ai'`，且 `failed|pending`，且无表/文件/图产物，且：

- custom-code：代码为空或仍为默认模板（含 `NotImplementedError` / 「请先编写 custom_code 函数」）
- 其它类型：无产物即视为空

有下游依赖的不删。用户手建节点不删。失败但已有实质代码的不删。

**时机：** Agent 一轮正常收束前内部调用 `cleanup_failed_ai_steps`（不进模型工具表）。

| 权限 | 行为 |
|------|------|
| 全部允许（confirmDestructive=false） | 直接删 |
| 请求权限 | 一次确认列出节点名，批准后删 |

## 6. AI 提示

- 白名单改为完整科学包列表。
- 标准图种用 `create_view` + `set_chart_config`；仅当原生图种不够时 `return go.Figure`。
- 报告 chart 章节可引用 `chartId`；看板可用 `chartId`。

## 7. 测试

- worker：health 含包；rdkit `MolFromSmiles`；statsmodels import（环境有包时；最小 CI 可 skip 未装包）。
- 前端：`pythonChartId` 稳定；`buildFlowGraph` 为 Figure 产物长出 python-chart 节点；`applyStepResult` 按 name 更新而非换 id。
- `isFailedEmptyAiStep` 用例：默认模板 / 实质代码 / 非 AI。
- 报告脚手架含 python 图；看板 ref 解析 chartId。

## 8. 风险

- rdkit / pyarrow 轮子较大，本机首次 `start.sh` 变慢。
- kaleido 在部分无头环境可能无法导出；报告 PDF 不依赖它（走前端 Plotly）。
