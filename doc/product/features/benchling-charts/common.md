# Benchling 图表共性配置（细化版）

> 来源：[`../../reference/benchling/analyze-data-with-benchling-analysis.md`](../../reference/benchling/analyze-data-with-benchling-analysis.md) + 截图/GIF 拆帧  
> 范围：仅细化已勾选功能点  
> 状态：**已细化**  
> 各图类型专属项见同目录下对应文档；共性项以本文为准

**关键配置截图：**

![configure-chart](https://help.benchling.com/hc/article_attachments/46023921660173)

---

## 已确认范围

### 1. 数据 / 属性设置（CONFIGURE）
- [x] View Type 切换
- [x] X-axis / Y-axis 列映射 + 类型图标（Aa/#）
- [x] X/Y 字段设置齿轮
- [x] X/Y 交换
- [x] Series
- [x] Error bars（列映射，标准图共性）
- [x] Color palette
- [x] Custom label（轴）
- [x] Save / Cancel

### 2. 布局 / 外观设置（STYLE）
- [x] Color · 按系列取色
- [x] Point · Shape / Opacity
- [x] Legend · Show/Hide / Position / Custom legend label

### 3. 其他设置
- [x] 从 Table 创建 / 切换为 Chart View
- [x] Edit（铅笔）打开配置侧栏
- [x] Filters & Transforms
- [x] Hover Tooltip
- [x] SPLIT WORKSPACE
- [x] 大数据抽样提示
- [x] SOURCE TABLE 链回底层表

### 排除（未勾选）
- Notebook / Outputs 嵌入与锁定
- **Regression / 回归全套**（`regressions.md` 未勾选，不纳入本产品）

---

## 0. 配置面板总结构

右侧编辑侧栏（截图核对）：

| UI 结构 | 说明 |
| --- | --- |
| **View type** 下拉 | 切换 Table / Bar chart / Line chart / Pie chart / Scatter plot / Heatmap；正文另列 Box plot |
| Tab：**CONFIGURE** | 轴映射、Series、Error bars、Color palette、Custom label |
| Tab：**STYLE** | 系列色、点样式、图例（回归除外；本产品不纳入回归） |
| 底部 | **Cancel** / **Save**（正文步骤亦称 Apply） |
| 底部入口 | **+ FILTERS & TRANSFORMS** |
| 工作区 | **SPLIT WORKSPACE** |

列类型图标（表头与轴控件）：

| 图标 | 含义 |
| --- | --- |
| **Aa** | 文本 / 分类 |
| **#** | 数值 |

---

## 1. 数据 / 属性设置（CONFIGURE）

### 1.1 View Type 切换

![change-view-type](https://help.benchling.com/hc/article_attachments/46023921659789)

| 项 | 说明 |
| --- | --- |
| 入口 | 配置侧栏顶部 View type 下拉 |
| 截图可见 | Table、Bar chart、Line chart、Pie chart、Scatter plot、Heatmap |
| 正文另列 | Box plot（产品已确认纳入） |
| 不纳入 | Regression（Advanced Analysis；本产品排除） |
| 行为 | 切换类型后保留可复用的列映射（能对齐的槽位），不适用槽位清空或隐藏 |

### 1.2 X-axis / Y-axis

| 项 | 说明 |
| --- | --- |
| 交互 | 下拉选择列；显示 Aa / # 类型图标 |
| 语义 | 按 View Type 解释（分类或数值）；示例见各图专章 |
| 截图例（Scatter） | X=`Sample ID`（Aa）；Y=`Average of Calculated Concentration`（#） |

### 1.3 轴字段 settings 齿轮

| 项 | 说明 |
| --- | --- |
| 位置 | X / Y 控件旁齿轮图标 |
| 产品要求 | 提供轴级设置入口；至少覆盖 **Custom label**（正文在 Configure 写明） |
| 扩展 | 对数轴、轴范围等在已勾选的图种专章展开（如 Line 对数轴、Bar 轴范围） |

### 1.4 X/Y 交换

| 项 | 说明 |
| --- | --- |
| 证据 | Regression SETUP 截图有 swap；**已确认为标准图共性** |
| 行为 | 一键交换当前 X 与 Y 的列映射（及各自齿轮内轴级设置） |
| UI | 轴控件旁互换按钮 |

### 1.5 Series

| 项 | 说明 |
| --- | --- |
| 取值 | `None` 或某一分类列 |
| 效果 | `None`：单系列；选列：按取值拆多系列并着色 |
| 截图例 | Scatter 默认 `None` |

### 1.6 Error bars（标准图共性）

| 项 | 说明 |
| --- | --- |
| 位置 | CONFIGURE 独立槽位（与 X/Y/Series 并列） |
| 类型 | 列映射；通常为数值列（#） |
| 截图例 | `Standard error of Calculated Concentration`；散点上为**竖直**误差棒 |
| 适用范围 | 已确认作为共性；Bar / Line / Scatter / Box 专章均勾选 |
| 空值 | 未映射时不绘制误差棒 |

### 1.7 Color palette

| 项 | 说明 |
| --- | --- |
| 位置 | CONFIGURE |
| 截图例 | `Benchling (30)` 预设色板 |
| 作用 | 多系列默认取色来源；可被 STYLE 逐系列取色覆盖 |

### 1.8 Custom label（轴）

正文步骤：

1. 打开配置侧栏  
2. 在 Configure 找到目标轴（X 或 Y）  
3. 在 **Custom label** 输入文本  
4. Save / Apply  

| 项 | 说明 |
| --- | --- |
| 默认 | 显示列名 |
| 覆盖后 | 轴标题显示自定义文本 |

### 1.9 Save / Cancel

| 按钮 | 行为 |
| --- | --- |
| **Save** | 提交配置并刷新图（正文称 Apply） |
| **Cancel** | 放弃未保存修改并关闭/退出编辑 |

---

## 2. 布局 / 外观设置（STYLE）

> 正文：适用于各图类型，**regressions 除外**。本产品无回归，故 STYLE 适用于全部已纳入图种（Heatmap 色阶另见 [heatmaps.md](./heatmaps.md)）。

### 2.1 Color · 按系列取色

| 步骤 | 说明 |
| --- | --- |
| 1 | Style → **Color** |
| 2 | 点击系列旁色块 |
| 3 | color picker 选色 |
| 4 | Save |

覆盖 CONFIGURE 色板对该系列的默认色。

### 2.2 Point · Shape / Opacity

| 控件 | 说明 |
| --- | --- |
| **Shape** | 标记形状（截图散点可见方块等） |
| **Opacity** | 透明度滑杆 |

适用于带数据点/标记的图种；饼图等无点几何时可隐藏该区（Pie 专章已勾选则保留能力位，见 [pie-charts.md](./pie-charts.md)）。

### 2.3 Legend

| 控件 | 选项 / 说明 |
| --- | --- |
| Show/Hide | 开关 |
| **Position** | Left / Right / Top / Bottom |
| **Custom legend label** | 可选；覆盖默认图例标题 |

---

## 3. 其他设置

### 3.1 创建 / 切换 Chart View

| 能力 | 说明 |
| --- | --- |
| 从 Table 创建 | 在表上新增 Chart View，选 View Type |
| 切换类型 | 见 1.1 |
| **Edit（铅笔）** | View 右上角；打开右侧配置侧栏 |

### 3.2 Filters & Transforms

| 项 | 说明 |
| --- | --- |
| 入口 | 侧栏底部 **+ FILTERS & TRANSFORMS** |
| 作用 | 改变作图输入行集（筛选、聚合等上游变换） |
| 关系 | 与表视图同源；图消费变换后的数据 |

### 3.3 Hover Tooltip

| 项 | 说明 |
| --- | --- |
| 内容 | 至少含当前轴字段值；有 Series 时含系列取值 |
| 证据 | 散点 / 热力 /（源）回归 GIF |

### 3.4 SPLIT WORKSPACE

| 项 | 说明 |
| --- | --- |
| 位置 | 工作区底部 |
| 作用 | 表 / 图（或流程图）分屏对照 |

### 3.5 大数据抽样提示

| 项 | 说明 |
| --- | --- |
| 文案形态 | `Showing a random sample of 1000 rows out of N… Download to view complete data` |
| 行为 | 图上仅绘抽样行；提供完整数据下载入口 |
| 产品 | 大数据作图时展示同类提示（阈值与阈值可配置，默认对齐源例量级） |

### 3.6 SOURCE TABLE

| 项 | 说明 |
| --- | --- |
| 位置 | 图编辑态底栏 / 链回 |
| 作用 | 跳转或展示生成该图的底层表 |

---

## 源命名对照

| 文档用语 | UI 标签 |
| --- | --- |
| Configure | CONFIGURE |
| Style | STYLE |
| Apply（正文） | Save（截图主按钮） |
| View Type | View type 下拉 |
| Series | Series |
| Error bars | Error bars |
| Color palette | Color palette |
| Custom label | Custom label |
| Custom legend label | Custom legend |
| Filters & Transforms | + FILTERS & TRANSFORMS |
| Split workspace | SPLIT WORKSPACE |
