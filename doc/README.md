# 文档中心

本目录按用途分为两类，避免「调研原文」与「产品开发依据」混放。

```text
doc/
├── README.md                          ← 本索引
├── reference/                         ← 参考资料（只读调研，不作为开发依据）
│   ├── labkey/
│   └── benchling/
└── product/                           ← 产品开发依据
    ├── features/
    │   ├── unified-charts/            ← 【当前】合并后的图表功能点（定稿）
    │   ├── charts/                    ← LabKey 细化原文（仅溯源）
    │   └── benchling-charts/          ← Benchling 细化原文（仅溯源）
    └── requirements/                  ← 功能需求文档
```

## 1. 参考资料 `reference/`

| 路径 | 说明 |
| --- | --- |
| [reference/labkey/](./reference/labkey/) | LabKey 五类图表官方文档摘录（含原图链接） |
| [reference/benchling/](./reference/benchling/) | Benchling Analysis 官方文档整理 |

> 参考资料**不应直接当作本产品需求规格**。

## 2. 产品开发依据 `product/`

| 路径 | 说明 |
| --- | --- |
| [product/features/unified-charts/](./product/features/unified-charts/) | **当前图表功能点（LabKey+Benchling 合并定稿）** |
| [product/features/charts/](./product/features/charts/) | LabKey 细化原文（已合并，仅溯源） |
| [product/features/benchling-charts/](./product/features/benchling-charts/) | Benchling 细化原文（已合并，仅溯源） |
| [product/requirements/](./product/requirements/) | 表（vxe-table）+ 图表一体化等需求 |

建议阅读顺序：

1. `product/features/unified-charts/` — 图表能力唯一依据  
2. `product/requirements/table-chart-integration.md` — 表 + 图一体化  

## 文档关系

```text
reference/labkey/*      ──►  product/features/charts/*           （溯源）
reference/benchling/*   ──►  product/features/benchling-charts/* （溯源）
                └──────────────► product/features/unified-charts/*  （定稿）
                                          │
                                          ▼
                               product/requirements/*
```
