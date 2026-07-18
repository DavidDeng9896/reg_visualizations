# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-e623e1cd-9151-4286-a4a9-09dab6b04363-7865`（Round 51；含 R49–50） |
| 阶段 | **优化 Round 51 完成**（周期 **3/3 · 合并**；目标 `lastMergedRound=51`） |
| 上次更新 | 2026-07-18 18:09 |
| 单元 | **381/381 PASS**（+listEmptyDemoCtaToast / listSkipTabAfterCreateCancel / deleteKeyEscDemoToastR51 / listEmptyCtaAriaControls / listProjectsWorkspaceChunkR51） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；List ~11.5 / ~4.5；Create ~3.2；CSV ~6.1；papaparse ~19.9；Workspace ~67.5；projects 仍 shared） |

## 2. Round 51 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| 空态 Demo CTA 焦点环 × toast | ✅ `listEmptyDemoCtaCoexistsWithToast` / `applyEmptyDemoCtaFocus` |
| Create Cancel 后 skip 仍可 skip→Tab | ✅ `listSkipTabAfterCreateCancel` |
| Delete-key Esc × Demo toast 回归 | ✅ `deleteKeyDangerEscDemoToastR51Regression` |
| empty CTA 焦点 × filter aria-controls 切换 | ✅ `shouldPreserveEmptyCtaFocusOnAriaControlsFlip` |
| List / projects / workspace 冷路径再评估 | ✅ 仍 keep-route-lazy / keep-shared / keep-sync-shell |
| 合并 | **是**（周期 3/3；R49–51 → main） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 52 计划（下一 cron · 周期 1/3）

1. **UX**：工作区空态 CTA × toast 环；列表 Demo 成功后焦点落地抽检
2. **Perf**：List gzip 边界（R51 ~11.5）；Create / CSV 再评估
3. **A11y**：Create Esc × Demo toast 回归；skip→empty landmark Tab 次序
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 1/3）
