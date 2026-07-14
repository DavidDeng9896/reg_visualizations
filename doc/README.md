# 文档中心

本目录按用途分为两类，避免「调研原文」与「产品开发依据」混放。

```text
doc/
├── README.md                          ← 本索引
├── reference/                         ← 参考资料（只读调研，不作为开发依据）
│   └── labkey/                        ← LabKey 官方图表文档整理
└── product/                           ← 产品开发依据（后续实现以此为准）
    ├── features/charts/               ← 图表功能点细则
    └── requirements/                  ← 功能需求文档
```

## 1. 参考资料 `reference/`

从外部产品/官网整理的调研原文，用于理解能力来源与 UI 形态。

| 路径 | 说明 |
| --- | --- |
| [reference/labkey/](./reference/labkey/) | LabKey 五类图表官方文档摘录（含原图链接） |

> 参考资料可修订、可增补，但**不应直接当作本产品需求规格**。产品范围以 `product/` 勾选与确认结果为准。

## 2. 产品开发依据 `product/`

经确认后的功能点与需求思考，作为后续产品设计/开发的依据。

| 路径 | 说明 |
| --- | --- |
| [product/features/charts/](./product/features/charts/) | Bar / Box / Line / Pie / Scatter 已确认功能点细化 |
| [product/requirements/](./product/requirements/) | 表（vxe-table）+ 图表一体化等需求文档 |

建议阅读顺序：

1. `product/features/charts/` — 弄清图表要做哪些能力  
2. `product/requirements/table-chart-integration.md` — 弄清如何挂在数据表上  

## 文档关系

```text
reference/labkey/*     ──调研摘录──►  product/features/charts/*
                                              │
                                              ▼
                                   product/requirements/*
                                      （表 + 图一体化）
```
