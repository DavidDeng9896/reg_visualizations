# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-b6200f33-743f-4d62-9a5f-7cc97f770e81-1496`（Round 47；含 R46 cherry-pick） |
| 阶段 | **优化 Round 47 完成**（周期 **2/3**；下一合并点 Round 48） |
| 上次更新 | 2026-07-18 14:07 |
| 单元 | **335/335 PASS**（+listLandmarkMigrate / listSkipTabRoving / deleteEscToastRing / dangerEscToastRing / flowchartTransformChunkR47） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；List ~10.9 / ~4.3；Create ~3.2；CSV ~6.1；Flowchart ~3.7；Transform ~8.4；papaparse ~19.9；Workspace ~67.5；projects 仍 shared） |

## 2. Round 47 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| 筛选 empty↔rows 后旧 landmark 焦点迁移 | ✅ `shouldMigrateListLandmarkFocus` / `migrateListLandmarkFocus` |
| Delete Esc 环 × toast 并存 | ✅ `deleteKeyDangerEscRingCoexistsWithToast` |
| skip 激活后 Tab 进入行 roving | ✅ `resolveNextTabAfterListSkip` / `listSkipTabEntersRowRoving` |
| danger Esc 环 × toast inert | ✅ `dangerEscRestoresRingAndToastInteractive` |
| List / Flowchart / Transform chunk 再评估 | ✅ 仍 keep-route-lazy / async-idle-warm / deferred-sync |
| 合并 | **否**（周期 2/3） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 48 计划（下一 cron · 周期 3/3 · 合并）

1. **UX**：landmark 迁移 × filter select 不抢焦点回归；Delete Esc 环 × Demo toast
2. **Perf**：List gzip（R47 ~10.9）边界；Create/CSV/projects 再评估
3. **A11y**：skip→Tab roving 与 filter Tab 次序共存；danger Esc × toast inert 回归
4. **验证**：unit + e2e:ui + build
5. **合并**：**是**（周期 3/3；目标 lastMergedRound=48，含 R46–48）
