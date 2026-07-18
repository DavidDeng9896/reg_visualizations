# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-318caea7-78fa-4615-9e9b-eb2572899e63-e32f`（Round 37） |
| 阶段 | **优化 Round 37 完成**（周期 **1/3**；下一合并点 Round 39） |
| 上次更新 | 2026-07-18 04:28 |
| 单元 | **211/211 PASS**（+csvParseChunk / dialogMarkers create+newView / overlayEsc New view / workspaceOverlay newView） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；CsvImportDialog ~6.1 / ~2.8；papaparse 独立 chunk ~19.9 / ~7.5；CreateAnalysisDialog ~3.2；AnalysisWorkspaceView ~67.5；无 EP） |

## 2. Round 37 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| Create Analysis / New view Teleport 到 body | ✅ `data-ia-create` / `data-ia-new-view` |
| dialogMarkers 扩展 | ✅ create + newView |
| New view 加入 workspaceDialogFlags | ✅ main/shell/toast inert 对齐 |
| New view × danger confirm Esc | ✅ `workspaceOverlayEscAllowed` |
| Create/New view 焦点环 | ✅ close / footer btn `:focus-visible` |
| CSV PapaParse 动态加载 + idle warm | ✅ `csvParseChunk`；CSV 对话框 chunk 大幅变瘦 |
| 列表→工作区冷启动 | ✅ workspace prefetch 推迟到 `listReady` 之后 |
| 列表 Create 时 shell inert + toast inert | ✅ |
| 合并 | **否**（周期 1/3） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 38 计划（下一 cron · 周期 2/3）

1. **UX**：列表 Create 空态 CTA ↔ Teleport 焦点回归；Combine/CSV 空态 CTA 与 New view 并存抽检
2. **Perf**：projects / STYLE chunk 再评估；CreateAnalysis idle-warm 自列表交互后
3. **A11y**：全 overlay 焦点环矩阵（Create/New view/CSV/Combine/Transform/Edit）；skip-link × New view
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 2/3；Round 39 合并）
