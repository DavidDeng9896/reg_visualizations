# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-345acef9-ae05-44e0-bbe9-c63c73d34994-2a2c`（Round 31；含 R25–30 基线） |
| 阶段 | **优化 Round 31 完成**（周期 **1/3**） |
| 上次更新 | 2026-07-17 22:10 |
| 单元 | **168/168 PASS**（+listSkip/main landmark、search force/no-match、sidebar inert、workspaceViewChunk、skip 决策） |
| UI E2E | **10/10 PASS**（创建后 treeitem 焦点断言） |
| Build | PASS（dist 无 EP；AnalysisWorkspaceView ~66.1 / ~23.9；projects 仍 defer） |

## 2. Round 31 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| 清除搜索 live：Esc 去重 / 空态 CTA force 宣告；无匹配 live | ✅ Round 31 |
| New view 创建后聚焦新树节点（E2E 覆盖） | ✅ |
| `#analysis-list` contains 收窄（空态专用；有数据 → `#analysis-list-main`） | ✅ |
| `#sidebar-empty` **不**纳入 workspace skip（主内容语义） | ✅ 评估结论 |
| New view 对话框打开时侧栏 chrome `inert` | ✅ |
| AnalysisWorkspaceView sync-shell 再拆分 | ✅ 仍 defer（`workspaceViewChunk`） |
| 合并 | **否**（周期 1/3；下一合并点 Round 33） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 32 计划（下一周期 2/3）

1. **UX**：侧栏搜索有匹配时的可选 count live；无匹配 → 清除后焦点环/搜索框可见性回归
2. **Perf**：ChartEditDrawer / STYLE 再评估；评估 `TableChartWorkspace` 与 workspace 壳的边界
3. **A11y**：dialog `inert` 扩展到 CSV/Combine/Transform；confirm 打开时侧栏 inert 对齐
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 2/3）
