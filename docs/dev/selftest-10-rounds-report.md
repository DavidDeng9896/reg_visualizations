# Insight Analysis 自测报告（10 轮）

> 生成时间：2026-07-16T10:19:26.183Z
> BASE_URL：http://127.0.0.1:5173
> 结果：**10 PASS / 0 FAIL**

## 汇总

| Round | 场景 | 状态 | 错误数 |
| --- | --- | --- | --- |
| 1 | 首页渲染：标题与创建按钮可见 | PASS | 0 |
| 2 | 创建空 Analysis 并进入工作区 | PASS | 0 |
| 3 | 一键 Demo：进入工作区无 DataCloneError | PASS | 0 |
| 4 | Demo 后切换 Flowchart / Workspace | PASS | 0 |
| 5 | CSV 上传创建表 | PASS | 0 |
| 6 | 侧栏 New view 创建柱状图视图 | PASS | 0 |
| 7 | 打开 Edit 图表并 Save | PASS | 0 |
| 8 | 过滤/转换对话框打开与 Save | PASS | 0 |
| 9 | 刷新后 Analysis 仍在列表（IndexedDB） | PASS | 0 |
| 10 | 删除 Analysis | PASS | 0 |

## 详细证据

### Round 1: 首页渲染：标题与创建按钮可见 — PASS

Notes:
- url=http://127.0.0.1:5173/

No errors collected.

### Round 2: 创建空 Analysis 并进入工作区 — PASS

Notes:
- url=http://127.0.0.1:5173/analyses/an_a4f2f031

No errors collected.

### Round 3: 一键 Demo：进入工作区无 DataCloneError — PASS

Notes:
- url=http://127.0.0.1:5173/analyses/an_2784b3e3
- tree=demo_dose_response.csv | ⋯ | Scatter Dose-Response (scatter) | ⋯

No errors collected.

### Round 4: Demo 后切换 Flowchart / Workspace — PASS

No errors collected.

### Round 5: CSV 上传创建表 — PASS

Notes:
- tree=selftest
⋯

No errors collected.

### Round 6: 侧栏 New view 创建柱状图视图 — PASS

Notes:
- tree=demo_dose_response.csv | ⋯ | Scatter Dose-Response (scatter) | ⋯ | New view (bar) | ⋯

No errors collected.

### Round 7: 打开 Edit 图表并 Save — PASS

No errors collected.

### Round 8: 过滤/转换对话框打开与 Save — PASS

No errors collected.

### Round 9: 刷新后 Analysis 仍在列表（IndexedDB） — PASS

No errors collected.

### Round 10: 删除 Analysis — PASS

No errors collected.
