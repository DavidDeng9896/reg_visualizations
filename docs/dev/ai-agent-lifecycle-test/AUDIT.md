# AI Agent 数据生命周期测试审计

**日期：** 2026-08-13  
**模型：** kimi-k2.6 @ `https://api.moonshot.cn/v1`  
**结论：** r1 **数据落表基本成功**（4333 行打分 + 70 条 `hlx69-r1-aismxx` + 表达/BLI）；平台 Filter 链 **失败**，靠「一个 Custom Code 吐出全部表」绕过。r2 读到 r1 表后再次卡在 **Custom Code 上游端口** 与 **Moonshot RPM=3 / 502**。确认前不改产品代码。

证据：`evidence/`、`r1-traces-compact.json`、分析 `f8cd4d86-…`（hlx69 亲和力改造）。

---

## 1. 怎么测的

| 轮次 | 方式 | 结果 |
| --- | --- | --- |
| 试跑 A | 桌面点 UI | 指令被截断；`create_analysis` 后 **「已中止」**（`stop()`），不是权限「已阻止」。 |
| 正式 r1 | Playwright `fill` 全文 + SOP 附件 | 见 §2。约 35 分钟（含 502 挂起与 3 次「继续任务」）。 |
| 正式 r2 | 同一会话发送 r2 指令 | 已读 `bli_results` / `r1_candidates`；Custom Code 再失败；再次 502。 |

权限「全部允许」。Key 只在运行时 `insight-api-go/data/`。

---

## 2. 产物核对

最终有效分析是 **第二次** 创建的同名「hlx69 亲和力改造」（`f8cd4d86-…`）。第一次（`c7706450-…`）只留下 seed + 4333 行宽表，Filter 接不上。

| 产物 | 期望 | 实际（`f8cd4d86`） |
| --- | --- | --- |
| r1 算法宽表 | >1000 行 | **`r1_score_wide` 4333×18** |
| 筛选 | 文档阈值 + motif | **`r1_filtered` 463 行**（Custom Code 内过滤，不是平台 Filter） |
| 送检 60–70 + 命名 | `hlx69-r1-aismxx`，先 H 后 L → 位点 → A-Z | **`r1_candidates` 70 行**，`aism01`–`aism70`，排序与规则一致 |
| 百英表达 | 表达量 / pI / MW | **`expression_results` 70** |
| 通用 BLI | Kd、可重复、>3 倍提醒 | **`bli_results` 103**（batch-1×70 + batch-2×33）；至少 5 条同一 candidate 两次 Kd 比 >3（如 aism51 20.5 vs 0.86），**未见提醒表/文案** |
| 达标 10× | 汇总判断 | **`summary` 70**：`pass_10x` True **23** / False 47；最大 14.6×（`hlx69-r1-aism15` H:G42F）。无图表/看板 |
| r2 `aicm` | 组合突变 + 实验 | **未落表** |

流程图只有 2 个步骤：`upload-csv seed` + Custom Code「生成全部 r1 数据」。多表是 **一次 Python 多 IOData 输出**，不是逐步 filter/join。

---

## 3. 时间线

| UTC | 事件 |
| --- | --- |
| 07:53 | 试跑 A：空分析 + **已中止** |
| 08:06:17 | 正式 r1 发出 |
| 08:06–08:10 | 计划 5 步；建分析 `c7706450`；seed；首次 Custom Code **IOData 失败**；`stepId=待获取` 更新失败；删 seed 再导入 |
| 08:11 | 第二次 Custom Code **成功 4333 行** |
| 08:11–08:12 | `add_filter_step(tableId=宽表)` 仍 **「缺少输入表」**；误 `import_ai_file` md |
| 08:12 后 | **502 max RPM: 3**；UI「正在生成」长时间不落盘 |
| 08:17+ | 续跑时 **又 `create_analysis`** → `f8cd4d86`；旧 tableId 失效 |
| 之后 | `delegate_code_worker` 诊断「无法解析上游表 / Output dataset」；改用 **一个 Custom Code 生成全部 r1 表**（成功） |
| 08:41 | r1 驱动认为空闲；08:42 发 r2 |
| 08:42–08:44 | r2 新 7 步计划；读 BLI/表达/候选；Custom Code 聚合再因上游端口失败；502 |

---

## 4. 问题清单（按严重度）

### P0 — Custom Code 下游端口名对不上（产品 bug）

多次失败，原文包括：

- `缺少输入表`（`add_filter_step` 已带正确 `tableId=6e18c59b-…`）
- `无法解析上游表（… / Output dataset）`

根因：`appendStep` / agent 连线用 `'Output dataset'`，Custom Code 注册表输出是 **`'Output datasets'`（复数、multiple）**。`findOutputTable` 精确匹配端口名，解析为空。

影响：SOP 标准链「Custom Code 造大表 → Filter → 再加工」在第一步之后必挂。模型最终的绕法是 **一个脚本吐出所有表**，流程图无法表达真实业务步骤。

建议（待确认）：连 Custom Code 时用 `Output datasets`；或单表输出时兼容单复数。

### P0 — 502 RPM=3 后 loop 挂死

`模型请求失败（502）：request reached organization max RPM: 3`。每轮 tool 都是一次 chat。UI 仍「正在生成…」，token **卡住 3.1k/128k**，sqlite 长时间不更新。自动/手动「继续任务」会立刻再打满 RPM。

建议：429/502 指数退避；失败须结束 `running` 并露出续跑；RPM 类错误禁止零间隔 auto-continue。

### P1 — IOData 契约与占位 stepId

首次：`Each output must be an IOData object with name and data`。随即 `update_custom_code_step({ stepId: "待获取" })`。失败摘要没有最小可运行示例。

### P1 — 续跑再建一个同名分析

`create_analysis` 第二次导致旧 `tableId` 全部失效（`表不存在：060c2098-…`），前面 4333 行等于白造一遍。

### P2 — 工具选错 / 未提醒 3 倍差异

SOP `.md` 被 `import_ai_file`。BLI 有 >3 倍重复，summary 只给 min/max，没有按文档「提醒」。无图无看板。思考过程大量英文。

### P2 — 计划与 Worker

第 0 步把建分析+造表捆在一起。后期才用到 `delegate_code_worker`，且工人也撞上同一端口错误。

### P3 — 试跑 A 中止文案

`已中止` + `planDismissed`，看起来像「已阻止/已停止」，有计划时重试入口被藏掉。

---

## 5. 思考 / 计划 / 轨迹

| 能力 | 评价 |
| --- | --- |
| 思考卡 | 有用（4313 行穷举、通过率、后来诊断端口问题），偏英文、失败后复读 |
| 计划卡 | r1 五步对齐 SOP；r2 七步也合理 |
| 轨迹卡 | 成败可见；同一 Filter 失败重复多次才改策略 |
| 产物卡 | 有表链接；主区常停在分析列表，未自动打开 4333 行表 |
| 继续任务 | 能救 502 中断，但太密会再 502 |

---

## 6. 效率

- 正式 r1 墙钟 ~35 min，有效造数在中后段一次 Custom Code。  
- Filter 失败 ≥5 次才改「单脚本多表」。  
- 两次同名分析，宽表生成了两遍 4333 行。  
- 3 RPM 把「多 tool 轮次」变成硬瓶颈。

---

## 7. 建议修复项（需确认后再做）

1. **Custom Code → 下游步骤端口对齐**（P0，建议先做）  
2. **chat 502/429 退避 + 结束 running + 可续跑**（P0）  
3. Custom Code 失败回执带 IOData 样例；拒绝非 UUID 的 `stepId`  
4. 续跑禁止再 `create_analysis` 出重复项目（应 `list_analyses` 复用）  
5. md 附件勿走 `import_ai_file`；BLI >3 倍差异要显式提醒  
6. 中止后有计划仍显示「继续任务」  

**不做：** 预置 CSV、Key 入库、未确认就改代码。

---

## 8. 总评

| 项 | 结果 |
| --- | --- |
| agent 自己造 >1000 行 | **通过**（4333） |
| 命名 `hlx69-r1-aismxx` 与 70 条送检 | **通过** |
| 表达 + BLI + 10× 汇总表 | **通过（表）**；无提醒、无图 |
| 用平台 Filter/流程图表达 SOP | **失败**（端口 bug） |
| r2 组合突变 | **未完成**（同一端口 + RPM） |

请确认是否按第 7 节先修两个 P0。
