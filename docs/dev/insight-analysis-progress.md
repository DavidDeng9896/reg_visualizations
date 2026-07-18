# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-c6ae8ba4-6b4c-4447-a8c8-7de9adfde9b4-b235`（Round 48；含 R46–47 cherry-pick） |
| 阶段 | **优化 Round 48 完成**（周期 **3/3 · 合并**；目标 `lastMergedRound=48`） |
| 上次更新 | 2026-07-18 15:07 |
| 单元 | **347/347 PASS**（+listLandmarkFilterNoSteal / deleteEscDemoToastRing / listSkipTabFilterOrder / dangerEscToastInertR48 / listCreateCsvChunkR48） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；List ~10.9 / ~4.3；Create ~3.2；CSV ~6.1；papaparse ~19.9；Workspace ~67.5；projects 仍 shared） |

## 2. Round 48 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| landmark 迁移 × filter select 不抢焦点 | ✅ `listLandmarkMigrateLeavesFilterFocus` / wasOnLandmark 门闸 |
| Delete Esc 环 × Demo-fail toast | ✅ `deleteKeyDangerEscRingCoexistsWithDemoToast` |
| skip→Tab roving × filter Tab 次序共存 | ✅ `listSkipTabCoexistsWithFilterOrder` |
| danger Esc × toast inert（Demo-fail）回归 | ✅ `dangerEscToastInertR48` |
| List / Create / CSV / projects chunk 再评估 | ✅ 仍 keep-route-lazy / async-idle-warm / deferred-dynamic / keep-shared |
| 合并 | **是**（周期 3/3；R46–48 → main） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 49 计划（下一 cron · 周期 1/3）

1. **UX**：列表行 Delete 后 roving 索引钳制 × toast；Create 打开时 skip 隐藏回归
2. **Perf**：List gzip 边界（R48 ~10.9）；Flowchart/Transform 冷路径再评估
3. **A11y**：filter Tab → 首行 roving 与 skip→Tab 合同抽检；danger Cancel × Demo toast
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 1/3）
