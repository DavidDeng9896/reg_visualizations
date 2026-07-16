# UI 全按钮浏览器自测 × 10 轮

> 时间：2026-07-16T20:12:51.716Z
> BASE：http://127.0.0.1:5173
> 结果：**9/10 轮全通过**

## 每轮汇总

| Round | 状态 | 失败步骤 | console错误 |
| --- | --- | --- | --- |
| 1 | FAIL | 一键Demo-散点图有墨迹; Flowchart按钮切换 | 1 |
| 2 | PASS | - | 0 |
| 3 | PASS | - | 0 |
| 4 | PASS | - | 0 |
| 5 | PASS | - | 0 |
| 6 | PASS | - | 0 |
| 7 | PASS | - | 0 |
| 8 | PASS | - | 0 |
| 9 | PASS | - | 0 |
| 10 | PASS | - | 0 |

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
- ❌ 一键Demo-散点图有墨迹 — Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
- ❌ Flowchart按钮切换 — TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('text=修改分析结构请从侧栏进行') to be visible

- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

Errors:
```
console.error: [Insight Analysis] render function TypeError: Cannot read properties of null (reading 'ce')
    at renderSlot (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=47718655:5488:32)
    at Proxy.<anonymous> (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-ZNN33HS2.js?v=47718655:9995:9)
    at renderComponentRoot (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:6814:17)
    at ReactiveEffect.componentUpdateFn [as fn] (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:8392:46)
    at ReactiveEffect.run (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:532:19)
    at setupRenderEffect (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:8527:5)
    at mountComponent (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:8299:7)
    at processComponent (http://127.0.0.1:5173/node_modules/.vite/deps/chunk-FT3SB2S6.js?v=b0276867:8251:9)
   
```

### Round 2 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 3 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 4 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 5 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 6 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 7 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 8 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 9 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除

### Round 10 — PASS

- ✅ 首页-创建按钮可见
- ✅ 一键Demo-散点图有墨迹
- ✅ Flowchart按钮切换
- ✅ Send output占位
- ✅ Connect external占位
- ✅ 新建bar视图-自动映射有效
- ✅ 切换line并出图
- ✅ 切换pie并出图
- ✅ 切换box并出图
- ✅ 切换heatmap并出图
- ✅ Edit图表-改拟合-Save
- ✅ 导出PNG按钮可点
- ✅ 过滤转换对话框
- ✅ 侧栏跳转流程图
- ✅ 返回列表并删除
