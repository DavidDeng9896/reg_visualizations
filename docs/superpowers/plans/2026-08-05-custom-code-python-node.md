# Custom Code Python Node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地流程图 Custom Code 步骤：`list[IOData]` 契约、独立 python-worker、CodeMirror 编辑器（字段插入+补全）、Go 代理；分期完成 file/chart/AI。

**Architecture:** insight-studio `custom-code` 步骤 → `POST /api/python/execute`（insight-api-go）→ `python-worker` 容器执行用户脚本；前端 `runStepAsync` 处理异步执行。

**Tech Stack:** Vue 3 + CodeMirror 6 (`@codemirror/lang-python`)、Go net/http 代理、Python FastAPI + pandas/numpy/scipy/sklearn/rdkit/plotly/openpyxl/pydantic

## Global Constraints

- I/O：`custom_code(inputs: list[IOData]) -> list[IOData]`；`data ∈ {BytesIO, DataFrame, go.Figure}`
- 白名单包 v1：pandas, numpy, scipy, scikit-learn, rdkit, plotly, openpyxl, pydantic
- 前端不直连 Worker；经 Go 代理
- Figure 不写入 bar/line `ViewNode.chart`
- 分支：`cursor/custom-code-python-node-1f47`

---

### Task 1: python-worker 执行服务

**Files:**
- Create: `python-worker/app/main.py`
- Create: `python-worker/app/executor.py`
- Create: `python-worker/requirements.txt`
- Create: `python-worker/Dockerfile`
- Create: `python-worker/tests/test_executor.py`
- Test: `cd python-worker && python -m pytest tests/test_executor.py -v`

**Interfaces:**
- Produces: `POST /execute` JSON in/out per design §6.2；`run_user_code(code, inputs) -> result`

- [ ] **Step 1:** 实现 `executor.py`：构建 `IOData`、exec 用户代码、调用 `custom_code`、校验返回、捕获 stdout/stderr/行号
- [ ] **Step 2:** FastAPI `main.py` 暴露 `/health` + `/execute`
- [ ] **Step 3:** 单测：DataFrame 入出、非法返回、语法错误带 line
- [ ] **Step 4:** Commit `feat(python-worker): add custom_code executor service`

### Task 2: insight-api-go 代理

**Files:**
- Modify: `insight-api-go/internal/api/server.go`
- Create: `insight-api-go/internal/api/python.go`
- Test: `cd insight-api-go && go test ./internal/api/ -count=1`

**Interfaces:**
- Consumes: Worker `POST {PYTHON_WORKER_URL}/execute`
- Produces: `POST /api/python/execute` 透传

- [ ] **Step 1:** 环境变量 `PYTHON_WORKER_URL`（默认 `http://127.0.0.1:8091`）
- [ ] **Step 2:** 代理 handler + 超时
- [ ] **Step 3:** Commit `feat(insight-api-go): proxy /api/python/execute`

### Task 3: 类型与步骤注册（前端）

**Files:**
- Modify: `insight-studio/src/shared/types.ts` — `StepType`、`StepOutputRefs.charts`、`AnalysisChartArtifact`、`Analysis.charts`
- Modify: `insight-studio/src/modules/steps/registry.ts` — category `code`、`custom-code` def
- Modify: `insight-studio/src/modules/flowchart/AddStepPanel.vue` — Code 分组
- Modify: `insight-studio/src/modules/steps/factory.ts`（若需）
- Test: registry 单测或 typecheck

- [ ] **Step 1:** 扩展类型与默认模板常量
- [ ] **Step 2:** 注册步骤与 AddStep 分组
- [ ] **Step 3:** Commit `feat(steps): register custom-code step type`

### Task 4: 异步执行 + customCode exec

**Files:**
- Modify: `insight-studio/src/modules/steps/exec/types.ts`
- Create: `insight-studio/src/modules/steps/exec/customCode.ts`
- Modify: `insight-studio/src/modules/steps/exec/index.ts` — `runStepAsync`、`applyStepResult` 写 charts/files/logs
- Modify: `insight-studio/src/modules/flowchart/FlowchartCanvas.vue` 等调用方
- Create: `insight-studio/tests/unit/steps/customCode.spec.ts`
- Modify: vite proxy（若需把 `/api/python` 指到 Go）

**Interfaces:**
- Produces: `runStepAsync(analysis, step): Promise<StepExecResult>`
- StepExecResult 扩展：`outputFiles?`、`outputCharts?`、`stdout?`、`stderr?`、`errorLine?`

- [ ] **Step 1:** 序列化表 → 调 `/api/python/execute` → 物化表
- [ ] **Step 2:** `IMPLEMENTED_STEP_TYPES` 加入 `custom-code`
- [ ] **Step 3:** UI 调用改 async
- [ ] **Step 4:** 单测（mock fetch）
- [ ] **Step 5:** Commit `feat(steps): async custom-code execution`

### Task 5: PythonEditor + 配置面板 + 字段插入/补全

**Files:**
- Create: `insight-studio/src/modules/steps/panel/PythonEditor.vue`
- Modify: `insight-studio/src/modules/steps/panel/StepConfigForm.vue`
- Modify: `insight-studio/package.json` — `@codemirror/lang-python`
- Create: `docs/features/steps/custom-code.md`

- [ ] **Step 1:** PythonEditor（高亮/折叠/补全列与 inputs）
- [ ] **Step 2:** 工具栏字段选择器插入 `inputs[i].data["col"]`
- [ ] **Step 3:** StepConfigForm 分支 + Save/错误行展示
- [ ] **Step 4:** Commit `feat(steps): PythonEditor and custom-code config UI`

### Task 6: file/chart/stdout（P1）

**Files:**
- Modify: `customCode.ts`、`applyStepResult`、节点端口展示
- Create: 简易 chart 预览组件（复用 Plotly ChartPanel 或只读 figure）

- [ ] **Step 1:** file 输入（`AnalysisFile.contentRef` 存 data URL/base64）与 BytesIO 输出
- [ ] **Step 2:** figure → `Analysis.charts` + Output charts
- [ ] **Step 3:** stdout/stderr 面板
- [ ] **Step 4:** Commit `feat(steps): custom-code files charts and logs`

### Task 7: AI 侧栏 + 工具（P2）

**Files:**
- Create: `insight-studio/src/modules/steps/panel/CustomCodeAiAssist.vue`
- Modify: `ai/tools/registry.ts`、`impl.ts`、`prompts.ts`

- [ ] **Step 1:** 侧栏生成代码并插入/替换函数体
- [ ] **Step 2:** `add_custom_code_step` / `update_custom_code_step`
- [ ] **Step 3:** Commit `feat(ai): custom-code assist and tools`

### Task 8: 联调与验收

- [ ] Worker + Go + 前端本地跑通：table→custom-code→新表
- [ ] rdkit 示例（若镜像可用）或跳过注明
- [ ] typecheck + 相关单测
- [ ] 更新 PR 描述

## Spec coverage

| Spec | Task |
|------|------|
| IOData 契约 | 1, 4 |
| 完整端口 | 3, 6 |
| Worker + Go | 1, 2 |
| Editor + 字段 | 5 |
| AI 侧栏 | 7 |
| 独立 chart 产物 | 6 |
| 白名单包 | 1 |
