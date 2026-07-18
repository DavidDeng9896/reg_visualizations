# UI 全按钮浏览器自测 × 10 轮

> 时间：2026-07-18T04:23:36.305Z
> BASE：http://127.0.0.1:5173
> 结果：**0/2 轮全通过**

## 每轮汇总

| Round | 状态 | 失败步骤 | console错误 |
| --- | --- | --- | --- |
| 1 | FAIL | 新建bar视图-自动映射有效; 切换line并出图; 切换pie并出图; 切换box并出图; 切换heatmap并出图; Edit图表-改拟合-Save; 导出PNG按钮可点; 过滤转换对话框; 侧栏跳转流程图; 返回列表并删除 | 0 |
| 2 | FAIL | 新建bar视图-自动映射有效; 切换line并出图; 切换pie并出图; 切换box并出图; 切换heatmap并出图; Edit图表-改拟合-Save; 导出PNG按钮可点; 过滤转换对话框; 侧栏跳转流程图; 返回列表并删除 | 0 |

## 步骤覆盖（每轮）

- 首页创建/Demo
- Demo 散点图 canvas 有墨迹（真出图）
- Flowchart / Send output / Connect external
- 新建 bar（自动映射）并验证 canvas
- 切换 line / pie / box / heatmap 并验证 canvas
- Edit 图表改拟合 Save
- 导出 PNG / 过滤转换 / 跳转流程图 / 删除

### Round 1 — FAIL

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ❌ 新建bar视图-自动映射有效 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '创建', exact: true })

- ❌ 切换line并出图 — TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('视图类型')

- ❌ 切换pie并出图 — TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('视图类型')

- ❌ 切换box并出图 — TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('视图类型')

- ❌ 切换heatmap并出图 — TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('视图类型')

- ❌ Edit图表-改拟合-Save — TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('视图类型')

- ❌ 导出PNG按钮可点 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '导出 PNG' })

- ❌ 过滤转换对话框 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /过滤 \/ 转换/ })

- ❌ 侧栏跳转流程图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ops-btn').nth(1)
    - locator resolved to <button type="button" tabindex="-1" data-v-1bc45fcc="" aria-haspopup="menu" aria-expanded="false" class="icon-btn ops-btn" aria-label="Scatter Dose-Response (scatter)
- ❌ 返回列表并删除 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Analyses' })
    - locator resolved to <a href="/" class="" data-v-e38fd09a="">Analyses</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - el

### Round 2 — FAIL

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ❌ 新建bar视图-自动映射有效 — Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: '创建', exact: true })

- ❌ 切换line并出图 — Error: locator.selectOption: Target page, context or browser has been closed
- ❌ 切换pie并出图 — Error: locator.selectOption: Target page, context or browser has been closed
- ❌ 切换box并出图 — Error: locator.selectOption: Target page, context or browser has been closed
- ❌ 切换heatmap并出图 — Error: locator.selectOption: Target page, context or browser has been closed
- ❌ Edit图表-改拟合-Save — Error: locator.selectOption: Target page, context or browser has been closed
- ❌ 导出PNG按钮可点 — Error: locator.click: Target page, context or browser has been closed
- ❌ 过滤转换对话框 — Error: locator.click: Target page, context or browser has been closed
- ❌ 侧栏跳转流程图 — Error: locator.click: Target page, context or browser has been closed
- ❌ 返回列表并删除 — Error: locator.click: Target page, context or browser has been closed
