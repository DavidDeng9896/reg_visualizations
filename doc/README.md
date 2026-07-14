# 文档中心

本目录按用途分为两类，避免「调研原文」与「产品开发依据」混放。

```text
doc/
├── README.md                          ← 本索引
├── reference/                         ← 参考资料（只读调研，不作为开发依据）
│   ├── labkey/                        ← LabKey 官方图表文档整理
│   └── benchling/                     ← Benchling Analysis 文档整理
└── product/                           ← 产品开发依据（后续实现以此为准）
    ├── features/
    │   ├── charts/                    ← LabKey 来源：已确认图表功能点细则
    │   └── benchling-charts/          ← Benchling 来源：功能点初稿（待确认）
    └── requirements/                  ← 功能需求文档
```

## 1. 参考资料 `reference/`

从外部产品/官网整理的调研原文，用于理解能力来源与 UI 形态。

| 路径 | 说明 |
| --- | --- |
| [reference/labkey/](./reference/labkey/) | LabKey 五类图表官方文档摘录（含原图链接） |
| [reference/benchling/](./reference/benchling/) | Benchling Analysis 官方文档整理 |

> 参考资料可修订、可增补，但**不应直接当作本产品需求规格**。产品范围以 `product/` 勾选与确认结果为准。

## 2. 产品开发依据 `product/`

经确认后的功能点与需求思考，作为后续产品设计/开发的依据。

| 路径 | 说明 |
| --- | --- |
| [product/features/charts/](./product/features/charts/) | LabKey 来源：已确认并细化的图表功能点 |
| [product/features/benchling-charts/](./product/features/benchling-charts/) | Benchling 来源：图表功能点初稿（**请先勾选确认**） |
| [product/requirements/](./product/requirements/) | 表（vxe-table）+ 图表一体化等需求文档 |

建议阅读顺序：

1. `product/features/charts/` — LabKey 侧已确认图表能力  
2. `product/features/benchling-charts/` — Benchling 侧初稿，确认后再细化  
3. `product/requirements/table-chart-integration.md` — 表 + 图一体化  

## 文档关系

```text
reference/labkey/*      ──►  product/features/charts/*          （已细化）
reference/benchling/*   ──►  product/features/benchling-charts/* （待确认）
                                      │
                                      ▼
                           product/requirements/*
                              （表 + 图一体化）
```
