# AI Analysis Capability Upgrade

日期：2026-09-08  
分支：`feat/ai-analysis-capability-upgrade`

## 问题根因

复杂表（空格表头、括号单位、多指标）上，原 AI 分析链路有三类结构性缺陷：

1. **意图**：系统提示偏「先计划再工具」，缺少对本轮分析目标（对比/趋势/相关/探索）的显式线索；「快速分析」易变成空转或问闲题。
2. **表理解**：`get_table_schema` / 工作区上下文只暴露 `title(type)`，不强调机器名 `field`；样例行无列标签。模型对 `docking score`、`localStrain(kcal)` 等易臆造列名。
3. **图表执行/展示**：
   - `set_chart_config` 先写入再校验 → 校验失败仍留下半成品配置；
   - `create_view` 可留下无映射空图；
   - `AiChartCard` 对 `EMPTY_FIGURE`（data=[]）当作加载成功，显示空白。

## 架构改动

| 模块 | 改动 |
| --- | --- |
| `intentHint.ts` | 本轮用户文本启发式意图 → 注入 system「意图线索」 |
| `tableSchema.ts` | 统一 schema/brief：`field=`、单位、空值/min-max、labeled 样例、配图建议 |
| `normalizeChartConfigure.ts` | 字段解析支持去单位括号/空格；X 名提示扩展 Compound/Title/Route |
| `tools/impl.ts` | `get_table_schema` 用富 schema；**`create_chart` 原子建图**；`set_chart_config` 先校验后写入 |
| `AiChartCard.vue` | 映射校验失败或空 figure → 明确失败文案 |
| `prompts.ts` / registry / workers / traceLabels | 对齐 create_chart 与意图流程 |

数据流（成功路径）：

```
用户句 → intentHint 注入
      → submit_plan（含目标/图种）
      → get_table_schema（field 精确名）
      → create_chart（内存校验 → 写入）
      → ArtifactCard / AiChartCard 渲染非空 Plotly figure
```

## Archon P0（已落地）

| 项 | 实现 |
| --- | --- |
| contentScrub | `extractThinkLeakage` 剥离 MiniMax `<think>…</think>`（含未闭合流式尾部）；`scrubVisibleContent` / 消息展示 / done 事件共用 |
| TableCatalog | `buildTableCatalog`；`runAgent` 每轮经 `getTableCatalog` 注入并替换旧块 |
| Join 显式 tableId | `add_join_step` 缺 `leftTableId`/`rightTableId` 直接失败，不回退默认表 |
| 计划完成强制 idle | 全部 `mark_step_done` 后立即 `done` + 结束 loop，避免卡在「正在生成」 |

## Fixtures（来自 data_entry_ai）

路径：`insight-studio/tests/fixtures/data_entry_ai/`

| 文件 | 用途 |
| --- | --- |
| `docking_scores_20241105.csv` | CADD docking，空格表头 + `(kcal)` 单位 |
| `pharmacophore_TREM_20251219.csv` | 药效团 Fitness / Align Score |
| `mouse_pk_auc_f.csv` | 多指标 PK（AUC/Cmax/T1/2/F）含单位 |

来源：`https://github.com/DavidDeng9896/data_entry_ai` 的 EO035 文档样本（未整库 vendor）。

## 回归场景（可复现）

在 `insight-studio` 目录：

```bash
npm test -- tests/unit/ai/complexTableAnalysis.spec.ts tests/unit/ai/impl.spec.ts tests/unit/ai/normalizeChartConfigure.spec.ts
```

覆盖：

1. docking schema 暴露 `field=\`docking score\`` / `localStrain(kcal)`；`localStrain` 可解析到带单位列。
2. mouse PK：`Dose` → `Dose (mg/kg)`，bar 映射通过校验。
3. pharmacophore scatter autofill + 校验通过。
4. intent：对比/相关/探索/仅清洗。
5. `create_chart` 失败不增视图；复杂表头散点用模糊 field 成功。
6. `set_chart_config` 校验失败不写入 `x=nope`。

## Live MiniMax 测试（勿提交密钥）

1. 确认 `.gitignore` 含 `*.local`（已覆盖 `.env.local`）。
2. 本地创建 **不提交** 的 `.env.local`：

```bash
# 仓库根或 insight-studio 旁均可；脚本会读环境变量
MINIMAX_API_KEY=sk-...          # 仅放环境 / .env.local
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.7-highspeed
```

3. 启动 API + Studio（示例）：

```bash
# 终端 A：Go API（若用 insight-api-go）
cd insight-api-go && go run ./cmd/server

# 终端 B：Studio
cd insight-studio && npm run dev
```

4. 在 AI 设置中填写同一 Base URL / Model / API Key（UI 写入用户配置，勿写进 git）。

5. 运行脚本化冒烟（只读 fixtures，调用 MiniMax chat completions）：

```bash
set -a && source .env.local && set +a
node insight-studio/scripts/live-minimax-analysis-smoke.mjs
```

脚本会：加载 docking/PK fixtures → 组一条「请出图」消息 → 调用 MiniMax → 检查响应是否含 tool_calls（submit_plan / get_table_schema / create_chart 等）。**不会把 key 打印到日志。**

## 非目标

- 不改变产品范围（看板/报告/统计库能力边界不变）。
- 不把 MiniMax key 写入源码、测试快照或 PR 正文。
