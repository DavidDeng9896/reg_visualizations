# 统一图表功能依据合并设计

> 日期：2026-07-16  
> 状态：冲突已决议，`docs/features/charts/` 细则已定稿；表+图需求已同步引用  
> 相关目录：`docs/features/charts/`

## 1. 目标

将 LabKey（`charts/`）与 Benchling（`benchling-charts/`）两套**已确认细化**的图表功能点合并为一套产品开发依据，供表（vxe-table）+ 图一体化需求引用。

## 2. 已确认决策

| 项 | 结论 |
| --- | --- |
| 产出形态 | 新建 `docs/features/charts/` |
| 旧目录 | `charts/`、`benchling-charts/` 保留，标「已合并，仅溯源」 |
| Heatmap | **纳入**独立图种 |
| 拟合形态 | **不**做独立 Regression 图种；能力挂在 **Scatter + Line** |
| 拟合能力 | Linear / Quadratic / **4PL**；**套索打标**；**MODEL TABLES**（两图种均支持） |
| Custom code / Plotly | **不纳入**本阶段 |
| 冲突策略 | 逐项勾选（见 `conflicts.md`） |
| UI 分层 | **CONFIGURE + STYLE**（Benchling 侧栏心智） |
| 表+图需求 | 同步更新 `table-chart-integration.md` 引用与图种 |

## 3. 执行方案（方案 1）

1. 写出 [`conflicts.md`](../features/charts/conflicts.md) 供拍板  
2. 用户勾选确认后，按决议写齐 `docs/features/charts` 各细则  
3. 更新 `table-chart-integration.md`；旧目录加溯源横幅  
4. 提交推送  

## 4. 目标目录

```text
docs/features/charts/
  README.md
  common.md
  bar-charts.md
  box-plots.md
  line-charts.md      # 含拟合 + 套索打标 + MODEL TABLES
  pie-charts.md
  scatter-plots.md    # 含拟合 + 套索打标 + MODEL TABLES
  heatmaps.md
  conflicts.md        # 第一轮拍板；决议后改为「已决议」或附录
```

每份细则统一结构：

1. 已确认范围  
2. CONFIGURE（数据映射）  
3. STYLE（外观）  
4. 其他（导出、Hover、拟合相关等）  
5. 源命名对照（LabKey / Benchling → 统一用语）  
6. 溯源链接  

## 5. 非目标（本阶段）

- Custom code / Plotly 多 Trace / 流程节点输出  
- 独立 Regression View Type  
- Notebook / Outputs 嵌入锁定  
- Benchling Flowchart 节点 I/O（Heatmap 侧未勾选部分）  
- 实现代码与绘图库选型拍板（可在表+图技术方案中另议）  

## 6. 成功标准

- 开发只依赖 `docs/features/charts/` + 更新后的 `table-chart-integration.md`  
- 每个冲突项在 `conflicts.md` 有明确决议（非 TBD）  
- 旧两目录不再表述为「当前产品依据」  

## 7. 自检

- [x] 无「另议」占位作为成功路径  
- [x] Regression 范围与「非独立图种但含 4PL/打标/MODEL TABLES」一致  
- [x] Custom code 明确排除  
- [x] 冲突勾选完成；统一细则已定稿  
