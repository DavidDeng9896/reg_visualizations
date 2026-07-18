# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-39762032-6b71-44bb-8846-8d779928d79f-7256`（Round 42；含 R37–41 sync） |
| 阶段 | **优化 Round 42 完成**（周期 **3/3 · 合并**；目标 `lastMergedRound=42`） |
| 上次更新 | 2026-07-18 09:06 |
| 单元 | **264/264 PASS**（+listRowDeleteKey / demoFailCreateFocus / listFocusOrder / dangerEscFocusRing / chunk R42） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；List ~10.0 / ~4.0；Create ~3.2；CSV ~6.1；papaparse ~19.9；Workspace ~67.5；projects 仍 shared） |

## 2. Round 42 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| 列表行 Delete 键 × roving | ✅ `listRowDeleteKey`；与 Arrow/Enter 共存 |
| Demo 失败后 Create 环回归 | ✅ `applyDemoFailCreateFocus` |
| 筛选 → 行组 Tab 次序 | ✅ `listFocusOrder` + `data-ia-list-filter` |
| danger confirm Esc 后焦点环 | ✅ `dangerEscRestoresVisibleRing` |
| List / workspace toolbar / projects chunk 再评估 | ✅ 仍 keep-route-lazy / keep-sync-shell / keep-shared |
| 合并 | **是**（周期 3/3；R37–42 → main） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 43 计划（下一 cron · 周期 1/3）

1. **UX**：列表筛选变更后 roving 焦点钳制抽检；Delete 键 × danger Esc 环回归
2. **Perf**：List gzip 边界（R42 ~10.0）；Create/CSV 冷路径再评估
3. **A11y**：筛选 `aria-controls` 指向表；空态 Demo 失败 toast × Create 环并存
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 1/3）
