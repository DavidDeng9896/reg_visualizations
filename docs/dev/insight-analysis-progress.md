# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/insight-analysis-app-9a40` |
| 阶段 | **图表自动映射修复 + 全按钮浏览器自测进行中** |
| 上次更新 | 2026-07-16 11:02 |
| 外部测试链接 | https://things-occasional-learn-quiz.trycloudflare.com/ |
| 单元 | `guessMapping` 6/6 PASS |
| 图表取证 | bar→line/pie/box/heatmap/scatter 均有 canvas 墨迹 |

## 2. 图表无法使用 — 根因与修复

### 根因（浏览器点击取证）

1. 新建 bar/pie 等视图时 **CONFIGURE 字段为空** → 画出无意义图形或空白  
2. 从 bar **切换到 line/scatter** 时仍保留分类字段作 X，而 line/scatter 用 `Number(x)` 过滤 → **全部点被丢弃，图空白**  
3. E2E 曾误点工具栏第二个下拉（图位置）而非图表类型

### 修复

- `src/modules/chart/guessMapping.ts`：按图类型做兼容字段推断；切换类型时丢弃不兼容字段；line/scatter 保证 X≠Y  
- `addView` / `onViewType` 调用 `guessConfigure`  
- `ChartPanel`：缺字段时提示「请配置…」；MODEL TABLES 折叠以腾出画布

## 3. 验证命令

```bash
npm test
npx tsx tests/e2e/chart-switch-forensic.mts
npx tsx tests/e2e/ui-full-10-rounds.mts
npm run build
```

## 4. 残余风险

| ID | 描述 | 状态 |
| --- | --- | --- |
| R3 | 4PL 拟合为 demo 级 | 开放 |
| R4 | 产物体积大 | 开放 |
| R5 | 外部隧道会随会话失效 | 开放 |
