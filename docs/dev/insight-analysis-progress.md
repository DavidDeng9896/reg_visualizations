# Insight Analysis 开发记忆（实时）

> 规格：[`../specs/2026-07-16-insight-analysis-framework-design.md`](../specs/2026-07-16-insight-analysis-framework-design.md)  
> 自测报告：[`./selftest-10-rounds-report.md`](./selftest-10-rounds-report.md)  
> 全按钮 UI×10：[`./ui-full-10-rounds-report.md`](./ui-full-10-rounds-report.md)  
> 优化轮次：见自动化记忆 `optimization-rounds.md`（每 3 轮合并一次）

## 1. 当前状态

| 字段 | 值 |
| --- | --- |
| 分支 | `cursor/bc-e7e1b36b-a809-4608-8689-a1f023f0146d-8a23`（Round 43） |
| 阶段 | **优化 Round 43 完成**（周期 **1/3**；下一合并点 Round 45） |
| 上次更新 | 2026-07-18 10:07 |
| 单元 | **278/278 PASS**（+listFilterRovingClamp / listFilterAriaControls / deleteKeyDangerEscRing / demoFailToastCreateRing / listCreateCsvChunkR43） |
| UI E2E | **10/10 PASS** |
| Build | PASS（dist 无 EP；List ~10.3 / ~4.1；Create ~3.2；CSV ~6.1；papaparse ~19.9；Workspace ~67.5；projects 仍 shared） |

## 2. Round 43 对齐摘要

对照 UX / 性能 / a11y：

| 需求 | 状态 |
| --- | --- |
| 筛选变更后 roving 焦点钳制 | ✅ `listFilterClampsRoving` + `shouldRefocusRowAfterFilter` |
| Delete 键 × danger Esc 环回归 | ✅ `deleteKeyDangerEscRing`（行 opener Esc 恢复环） |
| 筛选 `aria-controls` 指向表 | ✅ `listFilterAriaControls` → `analysis-list-main` / `analysis-list` |
| Demo 失败 toast × Create 环并存 | ✅ `demoFailToastKeepsCreateRing` |
| List / Create / CSV 冷路径再评估 | ✅ keep-route-lazy / async-idle-warm / deferred-dynamic |
| 合并 | **否**（周期 1/3） |

## 3. 验证命令

```bash
npm test
npm run build
npm run test:e2e:ui
```

## 4. Round 44 计划（下一 cron · 周期 2/3）

1. **UX**：筛选变更后若焦点在行上的 DOM 重聚焦抽检；空态 ↔ 有行切换时 filter `aria-controls` 动态切换
2. **Perf**：List gzip 边界（R43 ~10.3）；workspace toolbar / projects 再评估
3. **A11y**：列表行 Delete 打开 danger confirm 后 Cancel 环；Create 打开时 toast inert × Demo 失败环
4. **验证**：unit + e2e:ui + build
5. **合并**：否（周期 2/3；Round 45 合并）
