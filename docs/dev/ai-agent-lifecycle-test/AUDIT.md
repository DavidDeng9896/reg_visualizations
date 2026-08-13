# AI Agent 数据生命周期测试审计

**日期：** 2026-08-13  
**模型：** kimi-k2.6 @ `https://api.moonshot.cn/v1`  
**结论（修前）：** r1 数据落表基本成功，但平台 Filter 链失败（端口名），靠「一个 Custom Code 吐出全部表」绕过；r2 卡在同一端口 + RPM 502 挂死。  
**结论（P0 修复后复测）：** Custom Code → Filter **已通**（4333 行宽表 + 平台 Filter 211 行）。502 不再挂死 loop，会结束 running 并露出「继续任务」。送检/表达/BLI/r2 被 **Moonshot RPM=3 与当日 TPD 配额**打断，未跑完。未再改产品代码。

证据：`evidence/`（含 `post-fix-*`）、`r1-traces-compact.json`、`post-fix-traces-compact.json`。分析：修前 `f8cd4d86-…`；复测 `7e12eb3c-…`。

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

**已修（`2a6fe64`）：** `tableOutputPortName` / `resolveTableOutputPort` 兼容 `Output dataset` ↔ `Output datasets`。复测见 §9。

### P0 — 502 RPM=3 后 loop 挂死

`模型请求失败（502）：request reached organization max RPM: 3`。每轮 tool 都是一次 chat。UI 仍「正在生成…」，token **卡住 3.1k/128k**，sqlite 长时间不更新。自动/手动「继续任务」会立刻再打满 RPM。

**已修（同 commit）：** `postChat` 对 429/503/504 与多数 502 最多 4 次退避；耗尽后抛错，running 结束，「继续任务」可用。复测证实 loop **不再挂死**，但退避仍吃 Moonshot 文案里的 `after 1 seconds`，对 **RPM=3（每分钟 3 次）不够**，立刻续跑仍 502。见 §9。

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

## 7. 建议修复项

1. ~~Custom Code → 下游步骤端口对齐~~ **已做，复测通过**  
2. ~~chat 502/429 退避 + 结束 running + 可续跑~~ **已做，loop 不再挂死**；RPM=3 的退避仍偏短（见 §10）  
3. Custom Code 失败回执带 IOData 样例；拒绝非 UUID 的 `stepId`  
4. 续跑禁止再 `create_analysis` 出重复项目（应 `list_analyses` 复用）  
5. md 附件勿走 `import_ai_file`；BLI >3 倍差异要显式提醒  
6. 中止后有计划仍显示「继续任务」  
7. （新）RPM 类 502 不要信 `after 1 seconds`，至少按 20s+ 退避；TPD 配额耗尽应停止自动续跑并明确提示「日配额」而非只显示 502  

**不做：** 预置 CSV、Key 入库。

---

## 8. 总评

| 项 | 结果 |
| --- | --- |
| agent 自己造 >1000 行 | **通过**（4333） |
| 命名 `hlx69-r1-aismxx` 与 70 条送检 | **通过** |
| 表达 + BLI + 10× 汇总表 | **通过（表）**；无提醒、无图 |
| 用平台 Filter/流程图表达 SOP | 修前 **失败**；复测 **Filter 已接上**（见 §9） |
| r2 组合突变 | **未完成**（修前端口+RPM；复测 TPD/RPM） |

修前请确认第 7 节两个 P0。**已修并复测，见 §9。**

---

## 9. P0 修复后复测（09:30–10:06 UTC）

同一套 r1/r2 指令 + SOP 附件 + Playwright 驱动（`run-ui-test.mjs`），新会话，分析 `7e12eb3c-499a-4568-967b-d6e7917280ba`「hlx69 亲和力改造」。权限全部允许。轨迹：`post-fix-traces-compact.json`。

### 9.1 产物

| 产物 | 期望 | 复测实际 |
| --- | --- | --- |
| r1 算法宽表 | >1000，agent 自造 | **`r1_algorithm_scores` 4333×17**（Custom Code，含 WT） |
| 平台 Filter | 接在 Custom Code 下游 | **成功**：步骤 `Filter table`，**211 行**。连线 `from.port = "Output datasets"`（复数）→ Filter `Input dataset` |
| 送检 `hlx69-r1-aismxx` | 60–70 | **未落表**（Filter 之后派工程师造名单时 502） |
| 表达 / BLI / 10× / 图 | 有表有判断 | **未做** |
| r2 `aicm` | 组合突变 | **未做**（r1 湿实验表不存在；随后 TPD） |

流程图 3 步：`upload-csv anchor_wt` → Custom Code「生成 r1 单点突变算法打分宽表」→ **Filter table**。这是修前做不到的 SOP 链。

### 9.2 时间线

| UTC | 事件 |
| --- | --- |
| 09:30:22 | 发出全文 r1 |
| 09:31 | 7 步计划；建分析 `7e12eb3c` |
| 09:31–09:41 | `delegate_code_worker`：无上游表，无法 `add_custom_code_step` |
| 09:41:46 | `import_csv_text` → `anchor_wt` 1 行（锚点，非业务预置大表） |
| 09:42–09:47 | 三次 `add_custom_code_step` 失败：f-string 语法；两次 **IOData**（P1 仍在） |
| 09:48:05 | 工程师重试成功：**4333 行** `r1_algorithm_scores` |
| 09:48:46 / 09:48:58 | 驱动点了两次「继续任务」（当时像空闲） |
| 09:50:15 | **`add_filter_step` 成功**，Filter 211 行；`mark_step_done` 步骤 3 |
| 09:50 后 | `delegate_code_worker` 要在 Filter 表上造送检名单 → **502 RPM=3** |
| 10:04:34 | 驱动第三次「继续任务」；UI 已暂停，不再挂死 |
| 10:05:04 | 驱动误判 r1 结束，发出 r2 |
| 10:05 | r2：`list_tables` 看到 3 张表；再次 `import_ai_file` md 失败 |
| 10:05–10:06 | 502 RPM=3，再 502 **TPD**（`current: 1509374, limit: 1500000`） |

### 9.3 对照修前

| 项 | 修前 | 复测 |
| --- | --- | --- |
| Custom Code → Filter | `缺少输入表` / `无法解析上游表（Output dataset）` | **`add_filter_step` ok**，211 行 |
| 流程图 | 1 个 Custom Code 吐出全部表 | 宽表 Custom Code + **独立 Filter 步骤** |
| 502 后 UI | 「正在生成」挂死，token 卡住，sqlite 不更新 | **running 结束**；文案「因模型或网络错误已暂停」+「继续任务」；token 从 3.1k 升到 3.5k |
| 续跑再建分析 | 第二次 `create_analysis` 废掉旧表 | 本次续跑 **复用** `7e12eb3c` |
| 送检/表达/BLI | 绕过端口后补齐 | 被 RPM/TPD 截在 Filter 之后 |
| r2 | 端口 + RPM | 无湿实验表 + TPD |

截图：`evidence/post-fix-filter-ok.png`、`post-fix-iodata-retries.png`、`post-fix-r1-done-rpm502.png`、`post-fix-r2-done-tpd.png`。

---

## 10. 复测仍开放的问题

### P0 残余 — RPM=3 的退避太短

Moonshot 返回 `please try again after 1 seconds`。当前 `chatRetryDelayMs` 取 `after N seconds` 与指数退避的较大值，N=1 时大约 1–1.6s 连打 4 次，**仍然打满 RPM=3**。工程师子请求也会 502。驱动/用户立刻点「继续任务」同样瞬间再 502。

建议：识别 `max RPM` 时忽略 1s 提示，至少等 20–25s；连续 RPM 失败不要 auto-continue。

### 账号配额 — TPD

`organization TPD rate limit, current: 1509374, limit: 1500000`。当天两次完整 agent 跑把日 token 用尽，再续跑没有意义。产品应把 TPD 与 RPM 分开提示，并停止自动重试。

### P1 仍在 — IOData

连续三次 Custom Code 因 `Each output must be an IOData object with name and data`（另一次 f-string）失败，最后靠 `delegate_code_worker` 才写出 4333 行。失败回执仍无最小可运行示例。

### P2 仍在

- `import_ai_file` 导入 SOP `.md`（kind=text，仅 csv/excel）修前修后都有  
- Custom Code 仍需要一张锚点表（`anchor_wt` 1 行）才能挂步骤  
- 主区停在分析列表，未自动打开 4333 行表  

驱动侧：空闲后最多点 3 次「继续任务」就发下一轮。r1 其实还停在 502，r2 被提前发出。已把两次 continue 间隔从 2s 调到 8s，对 RPM=3 仍不够。

---

## 11. 复测总评

| 项 | 复测结果 |
| --- | --- |
| P0 端口对齐 | **通过**（平台 Filter 接上 Custom Code，211 行） |
| P0 502 不再挂死 | **通过**（暂停 + 继续任务；不再卡死「正在生成」） |
| agent 自造 >1000 行 | **通过**（4333） |
| 用平台 Filter 表达 SOP | **通过（到候选池）**；送检名单未做完 |
| 命名 / 表达 / BLI / r2 | **未完成**（RPM=3 + 当日 TPD） |

TPD 重置或换更高 RPM 的 Key 之后，**同一分析 `7e12eb3c` 从「继续任务」接着造 aism 名单即可**，不必重造 4333 行宽表。确认前不继续改产品代码。
