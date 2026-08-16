# Design: Custom Code（Python）分析节点

**日期：** 2026-08-05  
**状态：** Draft for review  
**需求来源：** `docs/requirements/2026-8-4 story-and-bug.md` §需求.7；对齐 [Benchling Automation Designer / Custom Code](https://help.benchling.com/hc/en-us/articles/46077729600909-Automate-Data-Analysis-with-Automation-Designer)

## 1. 目标与非目标

### 目标

- 在流程图中新增 **Custom Code** 步骤，嵌入托管 Python，支持 rdkit / 基础 ML 等超出内置变换的逻辑。
- **I/O 契约对齐 Benchling**：入参与返回均为 `list[IOData]`；`data ∈ {BytesIO, DataFrame, go.Figure}`。
- 节点端口完整：Input datasets / Input files；Output charts / datasets / files / Standard error / Standard output。
- 专业 CodeMirror Python 编辑器：高亮、折叠、行号；**工具栏字段插入 + 输入自动补全**。
- 编辑器旁 **AI 侧栏** 协助生成/修改代码；全局 AI 可增改步骤并运行。
- 独立 **Python Worker（Docker）**；经 `insight-api-go` 代理，前端不直连。

### 非目标

- 用户自定义 `pip install` / 任意第三方镜像。
- 将 Custom Code 的 `go.Figure` 强行映射为平台 bar/line 等 CONFIGURE 图种。
- 代码版本历史（仅保留最新 `step.config.code`；审计日志可后续加）。
- Automation Template / Run schema 绑定（属更大产品面，本设计不覆盖）。

## 2. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 产品对齐度 | 完整对齐 Benchling 端口与 IOData | 用户明确选 A；契约一次定死便于 AI 调用 |
| 运行位置 | 独立 Python Worker 容器 | 隔离、可装 rdkit/sklearn、可扩容 |
| AI 写代码 | 配置面板侧边内嵌助手 | 上下文就近；与全局 AI 工具互补 |
| 字段插入 | 工具栏选择器 + CodeMirror 补全 | 用户选 C |
| 图表输出 | 独立 Plotly JSON 产物 | 不扭曲现有图种配置模型 |
| 预装包 v1 | 精简核心集 | pandas/numpy/scipy/sklearn/rdkit/plotly/openpyxl/pydantic |
| 架构路径 | 步骤注册表 + Go 代理 + Worker | 与现有 flowchart/exec 一致，鉴权统一 |

## 3. I/O 契约与数据流

### 3.1 入口函数（固定）

```python
from io import BytesIO
from typing import NamedTuple
import pandas as pd
import plotly.graph_objects as go

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    ...
```

- 即使单输出也必须 `return [IOData(...)]`（也接受 `{"name","data"}` 字典或 `(name, data)` 元组）。
- 多输入按**连线顺序**进入 `inputs`；可用下标或按 `name` 查找。
- dataset ↔ `DataFrame`；file ↔ `BytesIO`；chart ↔ `go.Figure`。

### 3.2 流程图端口

| 方向 | 端口名 | PortType | 说明 |
|------|--------|----------|------|
| 入 | Input datasets | `table` multiple | 可空（仅文件输入时） |
| 入 | Input files | `file` multiple optional | 可与 table 混连 |
| 出 | Output datasets | `table` multiple | 由返回的 DataFrame 物化 |
| 出 | Output files | `file` multiple | 由返回的 BytesIO 物化 |
| 出 | Output charts | `chart` multiple | Plotly JSON 独立产物 |
| 出 | Standard error | 日志 | 挂步骤结果，可预览 |
| 出 | Standard output | 日志 | 同上 |

现有 `PortType = 'table' | 'file' | 'chart'` 已覆盖；stderr/stdout 作为步骤执行元数据，不必新增 PortType（节点 UI 仍展示两个日志口，与 Benchling 一致）。

### 3.3 执行数据流

```
上游 table/file
  → 前端序列化（表→columns/rows；文件→base64）
  → insight-api-go POST /api/python/execute
  → python-worker 容器：注入 IOData、调用 custom_code
  → 校验 list[IOData] 与 data 类型
  → 拆回 dataframe / file / figure + stdout/stderr
  → applyStepResult → analysis.tables / files / chart 产物
```

### 3.4 产物落盘

- `DataFrame` → 新 `AnalysisTable`（`stepId` 指向本步，`name` = `IOData.name`）。
- `BytesIO` → 新 `AnalysisFile`（文件名优先取 `IOData.name`）。
- `go.Figure` → Plotly JSON 图表产物（流程图预览 / 侧栏打开；**不**进入 bar/line CONFIGURE）。
- 返回值不合约 → `status=failed`，展示 `line` + `message`。

## 4. 节点 UI、编辑器与字段体验

### 4.1 步骤注册

- `StepType`: `'custom-code'`
- 类别：`Code`（AddStepPanel 新增分组）
- `IMPLEMENTED_STEP_TYPES` 纳入后可添加与重跑
- `defaultConfig`: `{ code: DEFAULT_TEMPLATE }`

### 4.2 配置面板

```
┌─ Custom code ─────────────────────┬─ AI 助手 ─┐
│ 工具栏：字段选择器 | 包说明 | 全屏   │ 对话/生成  │
│ PythonEditor（CodeMirror）         │ 一键写入   │
│ Name                               │           │
│ Cancel / Save（Save 后可 Run）      │           │
└───────────────────────────────────┴───────────┘
│ 执行后 Output 预览：表 / 图 / 文件 / 日志        │
```

### 4.3 PythonEditor

- 基于现有 `SqlEditor.vue` 模式新增 `PythonEditor.vue`。
- `@codemirror/lang-python`；行号、折叠、高亮、搜索、Mod-Enter 触发运行。
- 预置模板：Supported packages 注释 + `IOData` + `custom_code` 骨架（`NotImplementedError`）。

### 4.4 字段插入与补全

- **工具栏**：列出已连接 `inputs[i]`（name、kind）及表列；点击插入例如 `inputs[0].data["stage"]`。
- **补全**：`inputs` / `IOData` / 列名 / 白名单包；列 schema 来自当前上游。

### 4.5 错误与预览

- 失败：节点角标 + 面板 `line`/`message`。
- 成功：ANALYSIS DATA 树出现输出；面板可切换预览。

## 5. AI 助手与工具

### 5.1 侧栏小窗

- 自动注入：当前脚本、上游 inputs schema、IOData 契约、白名单、最近错误。
- 操作：插入光标 / 替换 `custom_code` 函数体（默认）/ 覆盖全脚本（需确认）。
- **不在侧栏直接执行**；执行仅经 Save/Run → Worker。

### 5.2 Prompt 硬约束

- 保持函数签名与 `list[IOData]` 返回。
- 只用白名单包；禁止 pip、网络、任意路径 IO。

### 5.3 全局 AI 工具

| 工具 | 作用 |
|------|------|
| `add_custom_code_step` | 接线上游、写入初始 code、可选 run |
| `update_custom_code_step` | 更新 code/name |
| `assist_custom_code` | 侧栏生成文本，由前端按钮写回编辑器 |
| 既有 `run_step` | 触发执行 |

## 6. Python Worker 与安全

### 6.1 拓扑

- 服务：`python-worker`（建议 FastAPI）。
- 镜像预装白名单；运行时无外网。
- 仅 `insight-api-go` 可调 Worker；前端走 `/api/python/execute`。

### 6.2 API 摘要

**Request**

```json
{
  "code": "...",
  "inputs": [
    { "name": "t1", "kind": "dataframe", "columns": [], "rows": [] },
    { "name": "f1", "kind": "file", "filename": "a.txt", "contentBase64": "..." }
  ],
  "limits": { "timeoutSec": 300, "maxMemoryMb": 2048 }
}
```

**Response**

```json
{
  "ok": true,
  "outputs": [
    { "name": "out", "kind": "dataframe", "columns": [], "rows": [] },
    { "name": "fig", "kind": "figure", "plotlyJson": {} },
    { "name": "x.csv", "kind": "file", "filename": "x.csv", "contentBase64": "..." }
  ],
  "stdout": "",
  "stderr": "",
  "error": null
}
```

失败：`ok:false`，`error: { message, line?, type? }`。

### 6.3 白名单（v1）

`pandas`, `numpy`, `scipy`, `scikit-learn`, `rdkit`, `plotly`, `openpyxl`, `pydantic`  
版本钉死在镜像与文档；编辑器模板注释同步。

### 6.4 限制

| 项 | 策略 |
|----|------|
| 超时 | 默认 300s，可配置，上限 900s |
| 网络 | 容器无出网 |
| pip | 禁止 |
| 磁盘 | 仅临时工作目录 |
| 资源 | cgroup memory/cpu；按用户/分析限流 |

## 7. 前端执行集成

- `modules/steps/exec/customCode.ts`：`resolveStepInputs` → 序列化 → 调代理 → 映射 outputs。
- `applyStepResult` 扩展：除 tables 外写入 files / chart 产物 / logs。
- Worker 不可达或超时 → `failed`，可重试。

## 8. 分阶段交付

契约与端口在类型层一次定齐；实现可分期：

| 阶段 | 内容 |
|------|------|
| P0 | table 入出 + Worker + 编辑器模板 + 字段插入/补全 + 错误行号 |
| P1 | file 入出 + chart 预览 + stdout/stderr |
| P2 | AI 侧栏 + 全局 add/update 工具 |
| P3 | 限流/审计、rdkit/sklearn 示例、超时调优 |

## 9. 验收标准

- [ ] 入/出均为 `list[IOData]`；dataset/file 可混连；顺序与连线一致。
- [ ] rdkit 示例（如 SMILES→分子量写回表）与基础 sklearn 脚本可跑通。
- [ ] CodeMirror：高亮/折叠/行号；工具栏插列 + 补全。
- [ ] AI 侧栏可生成并写入代码，且不绕过 Save/Run。
- [ ] Figure → 独立图表预览；失败显示行号+异常。
- [ ] 无网络、不可 pip；超时失败可感知。

## 10. 关键文件（预期）

```
insight-studio/src/shared/types.ts                          # StepType + config
insight-studio/src/modules/steps/registry.ts
insight-studio/src/modules/steps/exec/customCode.ts
insight-studio/src/modules/steps/exec/index.ts
insight-studio/src/modules/steps/panel/StepConfigForm.vue
insight-studio/src/modules/steps/panel/PythonEditor.vue     # 新建
insight-studio/src/modules/steps/panel/CustomCodeAiAssist.vue # 新建
insight-studio/src/modules/flowchart/AddStepPanel.vue
insight-studio/src/modules/ai/tools/registry.ts / impl.ts / prompts.ts
insight-api-go/internal/httpapi/python_execute.go   # 代理 /api/python/execute
python-worker/                                      # 新建：app、Dockerfile、requirements
docs/features/steps/custom-code.md                  # 用户向用法
docs/superpowers/specs/2026-08-05-custom-code-python-node-design.md
```

### 图表产物存储（明确）

在 `Analysis` / 步骤输出中增加 chart 产物引用（例如 `step.output` 扩展或并行 `AnalysisChartArtifact[]`：`{ id, name, stepId, plotlyJson }`），供预览与 Output charts 端口连线；**不**写入 `ViewNode.chart` 的 bar/line 配置。
## 11. 参考

- Benchling Help: Automate Data Analysis with Automation Designer（Custom Code 节）
- `docs/reference/automation-designer-custom-code.md`
- `docs/reference/raw/image-analysis.md`（附件 12–18）
- `docs/automation-designer-feature-list.md` §F
- 示例库：https://github.com/benchling/app-examples-python/tree/main/examples/custom-code-AD
