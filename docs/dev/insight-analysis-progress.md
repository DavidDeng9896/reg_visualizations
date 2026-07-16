# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/insight-analysis-app-9a40` |
| 阶段 | **10 轮 E2E 自测全绿后加固完成** |
| 上次更新 | 2026-07-16 10:20 |
| 外部测试链接 | https://things-occasional-learn-quiz.trycloudflare.com/ |
| E2E | **10 PASS / 0 FAIL**（`npm run test:e2e`） |

## 2. 10 轮自测（systematic-debugging）

### 第一轮结果（修复前）：5 PASS / 5 FAIL

| Round | 失败现象 | 根因（证据） |
| --- | --- | --- |
| 5 | From CSV strict mode | 测试选择器命中 Header+侧栏两个菜单（测试问题） |
| 6/7/8 | Demo 后无 Edit/树节点超时 | **`scheduleSave` 防抖未落盘**，`openAnalysis` 用空 DB 覆盖内存；且总选中第一张**表**而非 scatter 视图 |
| 10 | 找不到「确定」 | MessageBox 未设中文按钮文案（默认 OK） |

### 修复

1. 新增 `flushSave()`；Demo 导航前强制落盘  
2. `openAnalysis` 优先选中首个视图；支持 `selectNodeId`；工作区挂载保留内存选中  
3. MessageBox 明确 `confirmButtonText: '确定'`  
4. 侧栏 `⋯` 可点性增强；只读提示按视图类型区分  
5. 此前已修：`structuredClone` → `cloneDeep`（Vue Proxy）

### 第二轮结果（修复后）：**10 PASS / 0 FAIL**

## 3. 验证命令

```bash
npm test
npm run test:e2e
npm run build
npm run dev
```

## 4. 残余风险

| ID | 描述 | 状态 |
| --- | --- | --- |
| R3 | 4PL 拟合为 demo 级 | 开放 |
| R4 | 产物体积大 | 开放 |
| R5 | 外部隧道会随会话失效 | 开放 |
