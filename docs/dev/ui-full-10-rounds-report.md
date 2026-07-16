# UI 全按钮浏览器自测 × 10 轮

> 时间：2026-07-16T16:15:35.452Z
> BASE：http://127.0.0.1:5173
> 结果：**0/10 轮全通过**

## 每轮汇总

| Round | 状态 | 失败步骤 | console错误 |
| --- | --- | --- | --- |
| 1 | FAIL | 一键Demo-散点图有墨迹; Flowchart按钮切换; Send output占位; Connect external占位; 新建bar视图-自动映射有效; 切换line并出图; 切换pie并出图; 切换box并出图; 切换heatmap并出图; Edit图表-改拟合-Save; 导出PNG按钮可点; 过滤转换对话框; 侧栏跳转流程图; 返回列表并删除 | 0 |
| 2 | FAIL | - | 4 |
| 3 | FAIL | - | 4 |
| 4 | FAIL | - | 4 |
| 5 | FAIL | - | 4 |
| 6 | FAIL | - | 4 |
| 7 | FAIL | - | 4 |
| 8 | FAIL | - | 4 |
| 9 | FAIL | - | 4 |
| 10 | FAIL | - | 4 |

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
- ❌ 一键Demo-散点图有墨迹 — TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://127.0.0.1:5173/"
  navigated to "http://127.0.0.1:5173/"
  navigated to "http://127.0.0.1:5173/"
==========================
- ❌ Flowchart按钮切换 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Flowchart', exact: true })

- ❌ Send output占位 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Send output' })

- ❌ Connect external占位 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Connect with external tool/ })

- ❌ 新建bar视图-自动映射有效 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ops-btn').first()

- ❌ 切换line并出图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ws-toolbar .el-select').first()

- ❌ 切换pie并出图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ws-toolbar .el-select').first()

- ❌ 切换box并出图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ws-toolbar .el-select').first()

- ❌ 切换heatmap并出图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ws-toolbar .el-select').first()

- ❌ Edit图表-改拟合-Save — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ws-toolbar .el-select').first()

- ❌ 导出PNG按钮可点 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '导出 PNG' })

- ❌ 过滤转换对话框 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /过滤 \/ 转换/ })

- ❌ 侧栏跳转流程图 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.ops-btn').nth(1)

- ❌ 返回列表并删除 — TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Analyses' })


### Round 2 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 3 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 4 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 5 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 6 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 7 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 8 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 9 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```

### Round 10 — FAIL

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

Errors:
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
```
console.error: [vxe  table v4.20.2  ] [table] 不支持的参数 "show-overflow=true"，可能为 "show-overflow=title"
```
```
console.error: [vxe  table v4.20.2  ] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 https://vxeui.com/#/start/useUI/useGlobal
```
