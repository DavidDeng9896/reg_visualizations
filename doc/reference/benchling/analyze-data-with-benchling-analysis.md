# 使用 Benchling Analysis 分析数据

> 原文链接：[https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis](https://help.benchling.com/hc/en-us/articles/36096516002317-Analyze-data-with-Benchling-Analysis)  
> 英文原文备份：[analyze-data-with-benchling-analysis.en.md](./analyze-data-with-benchling-analysis.en.md)

---
1. [Benchling](https://help.benchling.com/hc/en-us)
2. [产品文档](https://help.benchling.com/hc/en-us/categories/6455186023309-Product-Documentation)
3. [分析与自动化](https://help.benchling.com/hc/en-us/sections/39551530102925-Analytics-Automation)

# 使用 Benchling Analysis 分析数据

![Anshi](https://help.benchling.com/system/photos/9321290433293/help-icon__1_.png)

Anshi

- 更新时间
  2026 年 5 月 22 日 20:54

Benchling Analysis 是一个强大的数据工作区，可帮助你导入、转换并可视化来自整个 Benchling 生态的数据。用它可构建可复现的分析流水线、应用统计变换，并生成图表；图表可作为输出保存，也可直接嵌入 Notebook 条目。Analysis 面向需要灵活、免代码工具来探索与解读实验数据的科研人员。

## 创建 Analysis

创建新的 Analysis 是使用 Benchling Analysis 工具套件的第一步。

![Screenshot 2025-07-15 at 10.59.20 AM.png](https://help.benchling.com/hc/article_attachments/38214373513101)

1. 在侧边栏点击 **全局创建图标**；点击 **Insights**，再选择 **Analysis**
2. 为分析输入名称（Name）并选择项目（Project）
   1. 请注意：该分析中的任何数据（包括从其他项目拉取的数据）都会对有权访问所选项目的全部用户可见
3. 点击 **Create**

## 浏览左侧边栏

Analysis 左侧边栏会按类型展示与该分析关联的全部视图。数据集、文件或图表类视图都会出现在侧边栏中，便于你在各工作成果间快速跳转，而无需回到主流程图。在侧边栏中选择任一视图即可直接打开。

左侧边栏包含以下功能：

- 创建 Analysis Tables —— 详见下文「创建 Analysis Table」
- 直接创建视图：可在侧边栏中从任意父/子视图直接创建新视图，无需进入流程图
- 搜索：使用侧边栏搜索框按名称快速查找视图
- 更深层级嵌套：视图可嵌套超过一层，便于组织复杂分析
- 全部展开/折叠：展开或折叠左侧边栏中显示的全部视图
- 转到流程图（Go to Flowchart）：在任一视图上点击该选项，跳转到该视图在流程图编辑器中的位置

![Analysis_Left-Sidebar_Improvements.gif](https://help.benchling.com/hc/article_attachments/46023901987981)

## 创建 Analysis Table

Analysis Tables 是 Analysis 中表数据的顶层单元；一个 Analysis 可包含多个 Analysis Tables。与 Insights 仪表盘不同，Analysis Tables 只能在 Analysis 内修改，且不会随 Analysis 外部数据实时更新。它们为筛选、转换，以及为作图、数据分析与导出准备数据提供基础。

![](https://help.benchling.com/hc/article_attachments/44559058813965)

要创建 Analysis Table：

1. 进入你要在其中建表的 Analysis
2. 点击 Analysis Tables 旁的 **+ 按钮**

在弹出菜单中，可通过多种方式从 Benchling 内外的数据创建分析表。各方法见以下小节。

### 从 Insights 查询创建 Analysis Table

使用已有的 Insights SQL 查询创建 Analysis Table。该选项仅对拥有 Data Warehouse 许可的 Benchling 用户可用。**注意：** 此类查询当前最多返回 50,000 行。

1. 选择 “From dashboard query”
2. 选择要导入的仪表盘与区块；此时可重命名表。数据表会在右侧面板预览
3. 点击 **Add table**

**![Screenshot 2025-05-01 at 10.10.39 AM.png](https://help.benchling.com/hc/article_attachments/36275865772045)**

### 从 Registry schema 创建 Analysis Table

使用 Registry 与 Result schema 数据创建 Analysis Table。

1. 选择 “From Registry schema”
2. 选择起始 Registry schema。这将把所选 schema 的全部实体拉入表中。可应用筛选缩小范围
3. 选择要包含的列。schema 上的实体链接可展开，以拉取关联 schema 数据
4. 点击 **Add Results**，添加针对所选 Registry schema 实体记录的 Results
   - 若 Result schema 上有多个字段可关联到该 Registry schema，会出现下拉框以指定用于 join 的字段
   - 选择 “Only include latest results” 会为每个实体仅拉取最新结果；“Include all results” 则包含针对该实体的全部结果数据
5. 点击 **Add table**

关于 Registry schema 表的说明：

- 最多可创建 50,000 行数据
- 该方法查询 Benchling 核心数据库，因此没有同步延迟
- 当选择多选字段或相关结果存在 >1 个值时，数据会拆到多行。关联数据通过 “left join” 连接。若需在下游分析中重新聚合，建议在需要时选择 “id” 列
- **创建的表是建表时执行查询所返回数据的快照，不会随时间更新。**

### 从 Plate 数据创建 Analysis Table

1. 选择 “From plate schema”
2. 选择要检索板数据的 schema
3. 通过名称标识符搜索并选择一个或多个要导入的板
4. 在可用选项列表中选择要检索的字段
5. 为新分析表指定名称
6. 点击 **Add table**

### 从 CSV 文件创建 Analysis Table

通过从 CSV 创建表，将数据直接上传到 Analysis 工具。**注意：** 该方法当前限制上传文件不超过 150MB。（行数与列数无限制。）

1. 选择 “From CSV”
2. 在 Upload CSV 下，选择 Choose a file 或拖放文件。将弹出窗口以选择上传文件。文件必须为 CSV 格式
3. 上传后，右侧会出现预览，可编辑的 “Name table” 字段会自动填入文件名
4. 可将 Analysis Table 名称从默认文件名改为其他名称
5. 点击 **Add table**

### 通过合并 Analysis Tables 创建 Analysis Table

连接两个 Analysis Tables 和/或 Views 以创建新的 Analysis Table。

1. 选择 “By combining tables”
2. 在 Analysis 中选择目标表，并选择 join 类型：
   - Left Join：保留左表全部行，匹配右表行
   - Inner Join：仅保留两侧匹配行
   - Right Join：保留右表全部行，匹配左表行
   - Full Join：保留两侧全部行
   - Append：按索引合并行，无需 join 键
3. 选择 join 类型后，需选择匹配两表列的 join 键
4. 选择 join 键后，Benchling 会在工作区右侧预览新表。按需重命名并点击 “Add table”。该表会加入 Analysis，可像其他 Analysis Table 一样操作或创建视图
5. 点击 **Add table**

创建表之后，即可创建 Analysis Views 以作图并转换数据。

### 通过 Look Up 创建 Analysis Table

通过查找已有 Benchling schemas 中的数据/元数据创建新的 Analysis 表。

![](https://help.benchling.com/hc/article_attachments/44559031799565)

1. 选择 **From Look Up**
2. 选择 Analysis 中用于查找数据/元数据的目标表
3. 从上表选择 look up 列
4. 选择标识符格式（Name、ID、Barcode），以匹配 look up 列中的值
5. 选择与 look up 列条目类型匹配的具体 schema

   ***注意：** 实体（Entities）schemas 目前对所有用户可用；其他 schema 类型将在未来支持*
6. 选择具体 schema 后，将提示你在 schema 中导航，以基于 look up 列匹配纳入额外数据/元数据。若 schema 与数据不匹配，该步骤可能失败或无结果
7. 点击 **Add table**

## 为分析准备数据格式

Analysis 更适合长表（long data）而非宽表（wide data）。长表中每一行只包含一次观测（例如一个孔），其他列是关于该观测的数据点。在其他环境中常使用宽表：许多列各自承载数据点，例如 “Cell Line 1” 与 “Cell Line 2” 分列，每列内是 Concentration 值。示例见下。宽表可通过 Unpivot 变换转为长表。

长表格式是使用聚合、分箱、分组等各类变换的必要前提。

**长表示例**

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Sample ID** | **Concentration** | **Cell Line** | **Type** | **Result** |
| 1 | 0.34 | 1 | Standard | 355 |
| 2 | 0.76 | 2 | Sample | 212 |
| 3 | 0.88 | 1 | Standard | 531 |
| 4 | 0.52 | 2 | Sample | 877 |

**宽表示例**

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| **Concentration Cell Line 1** | **Sample ID** | **Type** | **Concentration Cell Line 2** | **Sample ID** | **Type** | **...** |
| 0.34 | 1 | Standard | 0.76 | 2 | Standard | ... |
| 0.88 | 3 | Sample | 0.52 | 4 | Sample | ... |

## Analysis Views

Analysis View 是 Analysis Table 的副本，可通过筛选、变换与作图进行修改。Analysis Views 嵌套在其来源 Analysis Table 之下；若在 Analysis Table 层应用筛选，该筛选会作用于该表的 **全部** Analysis Views。

对 Analysis View 的数据修改不会向上传播到父 Analysis Table，也不会传播到其他 Analysis Views。但若通过 “By combining tables” 使用该 View 创建 Analysis Table，或将该 View 提升为 Analysis Table，则修改会传播到新表。详见「将 Analysis View 提升为 Analysis Table」。

![](https://help.benchling.com/hc/article_attachments/46023921659789)

## 创建 Analysis View

从 Analysis Table 创建新的 Analysis View，以便对数据应用变换或可视化。

1. 进入 Analysis 界面
2. 在 Analysis Table 下选择 **New view**
3. 选择要基于该表创建的 View 类型
4. 将按所选格式创建新 View，供进一步自定义
5. 要离开该 Analysis View，点击 **Flowchart**，或在左侧边栏选择其他视图

### 重命名 Analysis View

1. 选择要编辑的 Analysis View
2. 点击 View 左上角文本框以编辑名称
3. 新名称会自动保存
   1. 对已创建的 View，可能需要先点 **编辑图标** 打开文本框，再点 **勾选标记** 保存新名称

### 更改 Analysis View 类型

即使 View 已存在，也可随时在 Analysis 设置面板更改 View Type。类型包括（但不限于）表格、柱状图、箱线图、饼图、热力图与散点图。

1. 进入 Analysis
2. 选择要编辑的 View
3. 点击所显示 View 右上角的 **编辑** 图标
4. 在右侧设置面板的 “View Type” 下，从下拉菜单选择目标类型
5. Analysis View 会自动保存

![Screenshot 2025-05-01 at 10.22.59 AM.png](https://help.benchling.com/hc/article_attachments/36275838572301)

### 将 Analysis View 提升为 Analysis Table

Analysis View 可提升为 Analysis Table。提升后的 Analysis Table 会持续反映其来源 Analysis View 的变更。这也是创建新 Analysis 表的一种方式。提升图形类 View（如热力图或散点图）时，会提升生成该图的底层数据表。该数据表可在 Analysis view 的编辑模式中看到。

1. 选择要提升的 View
2. 点击 View 右上角的 **... 图标**
3. 选择 “Promote view to table”

![Screenshot 2025-05-01 at 10.25.10 AM.png](https://help.benchling.com/hc/article_attachments/36275865773069)

## Analysis 作图能力

Benchling Analysis 支持多种图表类型与配置选项，帮助可视化并解读数据。创建 Analysis View 并选择图表类型后，即可配置坐标轴、设置数据点样式、自定义颜色与图例——无需离开 Analysis 工具。

### 了解图表类型

Analysis 支持以下图表类型。要选择或更改类型，请进入 Analysis View，并在右侧配置侧栏中选择 View Type。

- 柱状图（Bar chart）
- 折线图（Line chart）
- 散点图（Scatter plot）
- 箱线图（Box plot）
- 热力图（Heatmap）
- 饼图（Pie chart）
- 回归（Regression）——注意：仅对拥有 Advanced Analysis 权限的用户可用（见下文 Regressions）

### 配置图表

每个图表视图在屏幕右侧有配置侧栏，用于控制轴映射、系列与样式选项。

![](https://help.benchling.com/hc/article_attachments/46023921660173)

配置图表：

1. 进入要配置的 Analysis View
2. 点击所显示 View 右上角的编辑图标，打开配置侧栏
3. 在 **Configure** 部分用下拉菜单映射 X 轴、Y 轴与 Series 列
4. 在 **Style** 部分按需调整外观选项（见下文「自定义图表外观」）
5. 点击 **Apply** 保存配置

### 自定义图表外观

Analysis 提供多种自定义图表视觉外观的选项。这些选项位于配置侧栏的 Style 部分，适用于除回归以外的所有图表类型（除非另有说明）。

#### 取色（Color picking）

使用取色工具直接控制图表中每个数据系列的颜色。不必依赖默认色板，可为每个系列指定颜色，以符合惯例或提高可读性。

自定义颜色：

1. 打开图表配置侧栏
2. 在 **Style** 下找到 **Color** 部分
3. 点击要更改系列旁的色块
4. 在取色器中选择颜色
5. 点击 **Apply** 保存

#### 点样式（Point styling）

自定义图表上单个数据点或标记的外观，包括形状与不透明度。

调整点样式：

1. 打开图表配置侧栏
2. 在 **Style** 下找到 **Point** 样式部分
3. 从可用选项中选择标记形状
4. 用 **Opacity** 滑杆设置点的透明度
5. 点击 **Apply** 保存

#### 自定义轴标签

用自定义文本覆盖默认的列名轴标签，使图表更清晰、更适合展示。

设置自定义轴标签：

1. 打开图表配置侧栏
2. 在 **Configure** 部分找到要重命名的轴（X 或 Y）
3. 在 **Custom label** 字段输入标签文本
4. 点击 **Apply** 保存

#### 图例设置

控制图例是否显示、出现位置，以及显示的标签。

配置图例：

1. 打开图表配置侧栏
2. 在 **Style** 下找到 **Legend** 部分
3. 用开关显示或隐藏图例
4. 若图例可见，用位置下拉选择 Left、Right、Top 或 Bottom
5. （可选）输入 **Custom legend** 标签
6. 点击 **Apply** 保存

## 标记数据（Flag data）

Benchling Analysis 中的数据标记允许你在表视图中手动为数据行添加注释与评论。每个标记都带有评论，并可用 Analysis 常规筛选进行过滤。标记是针对特定数据集与分析、在特定时间点进行的手动过程。概念上，你应标记异常或需要特殊处理的行——尤其当特殊处理原因并未记录在数据本身时。若原因已体现在数据中，应使用常规筛选（筛选可自动化，标记不行）。添加或移除标记（或删除相关步骤）的每一步都会写入审计日志，以便记录并可还原全部标记相关变更。

![](https://help.benchling.com/hc/article_attachments/36096496993933)

### 为行添加标记

将光标移到行左侧行号处，会出现复选框，点击以选中行。可按需选择多行。

![flags1.png](https://help.benchling.com/hc/article_attachments/37202810031501)

点击表上方出现的 **Flag** 按钮。输入说明为何标记这些行的评论。评论为必填。你输入的评论会应用于所有选中行。提交后，将可见 Flag 列（标记行）以及新的 Comment 列。

![flags2.png](https://help.benchling.com/hc/article_attachments/37202830915469)

***注意：** 一旦标记行，该表之前的 Analysis 中所有前置步骤将被锁定，不可再编辑。*

### 筛掉（或筛出）已标记行

行被标记后，可通过对 Flag 列添加筛选，筛掉已标记行或筛掉未标记行。例如，将筛选设为 “Flag equals false” 可筛掉已标记行。

![](https://help.benchling.com/hc/article_attachments/36096496995725)

### 移除标记

选择要移除标记的行，点击 Clear 按钮。清除标记同样需要评论。

另一种删除标记的方法是在 Filters and Transformations 侧栏中删除该步骤。与 Analysis 中其他变换或筛选一样，更改标记行（添加或移除）会导致所有下游 Analysis 步骤与变换重新运行。

在分析表中添加标记后，请注意以下限制：

- **数据标记步骤**：每次标记操作都会在 Filters and Transformations 列表中创建 “Flag rows” 步骤。

![](https://help.benchling.com/hc/article_attachments/36096496996621)

- **多重标记：** 可对同一行添加多个标记。所有添加的标记都会出现在审计日志中。但在 Analysis 中，无论添加几个标记，Flag 列只显示一个标记，Comment 列只显示最新评论。
- **锁定：** 带有标记行的表之前的所有视图与表都会被锁定。因为更改前置变换与筛选可能改变下游数据，从而使标记含义或有效性失效。为安全起见，带标记行视图之前的步骤全部锁定。移除标记后锁定解除。为便于找到导致部分分析被锁定的视图，带标记行的视图旁会显示 Flag 图标。

![](https://help.benchling.com/hc/article_attachments/36096515972621)

- **复制与模板：** 标记针对特定时间的特定数据集与分析，不建议复制带标记的分析。若复制，标记会原样复制。不允许从带标记行的分析创建模板。
- **JOIN** 与 **UNION**：若在数据标记步骤之后发生 JOIN 或 UNION，标记与评论会分别转为简单布尔值与文本。之后新建的第二个标记步骤会创建新的 flag 与 comment 列。

## 在 Analysis 中变换与筛选数据

可通过变换与筛选操作 Analysis Views。变换可用于筛选与排序列，以及对数据执行数学、统计与逻辑运算等。

### 向 Analysis View 添加变换

变换是操作载入 Analysis 的数据表的主要手段。可添加到 Analysis Views，并执行多种强大功能。添加变换：

1. 点击 Filters & Transforms 旁的 **+ 图标**
2. 选择要应用的变换
3. 在变换弹窗中填写信息以正确变换数据，然后点击 **Submit**

![Screenshot 2025-05-01 at 11.00.00 AM.png](https://help.benchling.com/hc/article_attachments/36275838574349)

### 标准变换

当前标准变换选项包括：

**Add computed column** —— 用数学、统计、逻辑、字符串或日期时间函数组合创建计算列

**Add window function column(s)** —— 在数据子集上应用窗口函数

**Aggregate table** —— 对一组输入值应用数学聚合函数

**Bin data** —— 将数值列划分为指定数量的分箱

**Convert column formats** —— 将列的数据类型转换为另一类型

**Find and replace text** —— 将指定字符串替换为新值。支持字符串或正则表达式

**Hide columns** —— 将列可见性改为隐藏

**Pivot table** —— 由个体值创建分组值表

**Rename columns** —— 更改列标题

**Reorder columns** —— 更改表中列顺序

**Sort columns** —— 按升序或降序排序列

**Unpivot table** —— 展平表格，将聚合列转为行

若你拥有 Advanced Analysis，还可使用 Regression 与 Interpolation 变换。回归与插值可建模数据关系并基于现有趋势预测。回归通过拟合曲线创建数学模型，帮助理解关系并识别关键参数。插值用这些回归模型预测新数据点的值，填补数据集缺口。关于变换的更多信息，请参阅[本文](https://help.benchling.com/hc/en-us/articles/30231230015373-Analysis-Functions-Overview)。

以下章节介绍如何创建与配置回归、解读结果，以及如何在 Benchling 中无缝使用插值计算新值。

## 回归（Regressions）

***注意：** 回归仅对拥有 Advanced Analysis 权限的用户可用。*

### 创建回归

1. 在包含回归所需 X、Y 变量的已有表下添加新视图时，选择 **Regression**
2. 将创建新回归，并自动打开编辑视图
3. 创建后，可在回归视图内通过筛选或变换修改来自原表的数据

### 配置回归

编辑侧栏允许你配置散点图并编辑回归本身：![](https://help.benchling.com/hc/article_attachments/36096496969741)

1. 为图的 X、Y 轴选择合适的列
2. 用下拉选择回归模型：
   - Linear（线性）
   - Quadratic（二次）
   - 4PL
3. 配置可选项，例如：
   - Weights —— 用 “Weights” 下拉为数据点设置权重。默认所有点等权。下拉弹出层中有更多信息链接
   - 4PL constraints —— 对 4PL 回归可设置约束。默认由算法确定约束
4. 点击 **Apply** 生成回归，回归线会自动添加到图表

![](https://help.benchling.com/hc/article_attachments/36096496970253)

### 编辑回归

1. 点击 **Edit** 修改模型或权重
2. 完成更改后再次点击 **Apply** 以更新回归

### 回归相关表

图表下方提供以下表：

![](https://help.benchling.com/hc/article_attachments/36096496971021)

- **Source Table**：用于建模的数据框
- **Model Output Table**：包含建模所用数据、预测与残差计算
- **Model Variables Table**：显示回归得到的参数，包括：
  - 线性回归：斜率与 y 截距
  - 4PL 回归：Min、Max、Hill Slope、Inflection Point
  - 同时包含参数的置信区间

## 在回归上标记离群点

可视化标记工具允许你用图表识别并标记与其余数据显著不同的数据点，以便进一步调查或排除。可视化标记可用于回归图。

**注意：** 该功能处于 beta，了解 [功能处于 beta 的含义](https://help.benchling.com/hc/en-us/articles/34725874943117-Understanding-Benchling-Release-Stages#:~:text=To%20ensure%20these%20updates%20are,readiness%2C%20stability%2C%20and%20support.) 请阅读相关文章。

***注意：***

- ***启用：** 关于如何获取当前处于 beta 的 Analysis 功能，请阅读 [*Insights Labs 文章*](https://help.benchling.com/hc/en-us/articles/37074893033357-Insights-Labs)。*
- ***可用性：** 功能适用于新创建的回归，或在流程图编辑器中重新运行已有回归。*

### 标记点

![Visual Flagging.gif](https://help.benchling.com/hc/article_attachments/43250045089037)

1. 创建或打开回归的 Analysis 视图
2. 在图上靠近要标记的点处点击并拖动光标。会出现套索，可拖动套索框选要标记的一个或多个点
3. 用套索高亮目标点后，图右上角会出现菜单
4. 点击 **Flag** 以标记数据点
5. 在文本框输入评论并点击 **Save**

保存后，被标记的点在图上会以 “X” 标记样式显示。在 Source Table 中，被标记点会体现在两列新列中：“Flag”（True/False）与 “Comment”（文本）。

***注意：** 可在图表预览中标记点，也可在编辑/配置图表时标记。*

### 取消标记点

![](https://help.benchling.com/hc/article_attachments/43250000662797)

1. 用套索选择要取消标记的已标记点
2. 高亮后，图右上角会出现菜单
3. 点击 **Clear**
4. 输入评论并点击 **Save**
5. 清除标记的点会恢复为图上原先的样式

### 排除已标记值

点经该工具标记后，可从下游计算（如回归拟合）中排除。

![](https://help.benchling.com/hc/article_attachments/43250000663693)

1. 在图表配置的 Regression 部分，会出现 **Exclude Flagged Values** 复选框
2. 勾选该字段并点击 **Apply** 重新应用回归拟合后，拟合会在排除已标记点的情况下重新计算
3. 这将更新 Model Variables 表的值以反映排除
4. 取消勾选 **Exclude Flagged Values** 并点击 **Apply**，被排除的标记点会重新纳入回归拟合

***注意：** 从回归拟合中排除的点仍会在图上可见，但不会参与计算。若希望从图上视觉移除标记点，可配置筛选 Flag = False*

## 插值（Interpolations）

***注意：** 插值仅对拥有 Advanced Analysis 权限的用户可用。*

### 添加插值

1. 在**非**创建回归的那个视图的编辑侧栏中，滚动到底部，点击 **Transformations** 旁的 **+**
   - **注意：** 请确保你在与创建回归不同的视图中操作
2. 从菜单选择 **Calculate interpolation**
3. 在弹窗中：
   - 选择要使用的回归模型
   - 选择包含未知值的输入列（来自当前视图）
   - 选择输入值作为 X 预测 Y，或相反
   - （可选）选择一列作为 Series 变量对插值分组
4. 点击 **Submit**

![](https://help.benchling.com/hc/article_attachments/36096515939981)

插值完成后，输入表最右侧会出现名为 **Prediction** 的新列，包含插值结果。

![](https://help.benchling.com/hc/article_attachments/36096515942285)

插值步骤会以 chip 形式出现在已应用变换列表中，点击 chip 可修改。

![](https://help.benchling.com/hc/article_attachments/36096496978829)

可将带插值的视图提升为表，以便按需将插值结果加入图表或其他表。

## Analysis 筛选器

用户可为 Analysis Tables 与 Analysis Views 添加筛选。筛选与 Analysis Table 或 Analysis View 中的列是 1:1 关系。即一列只能关联一个筛选，但该筛选可有多个条件。Analysis View 会继承其父表上的筛选，并可在 View 层追加筛选。

若要对多列应用某些筛选，需分别对每列应用独立筛选。筛选按列表顺序应用于 Analysis Table 或 Analysis View。要确认筛选与变换的应用顺序，请点击 Analysis 右上角的 “View flowchart” 按钮。

#### 筛选条件

筛选条件定义用于决定显示或隐藏哪些数据的准则。一个筛选可应用多个条件。

若要对多列应用某些条件，需为每列分别创建带有这些条件的筛选。

**Analysis 工具支持以下筛选条件：**

- 文本列 “TC” 选项
  - TC **is null**
  - TC **is not null**
  - TC **equals** text
  - TC **does not equal** text
  - TC **contains** text
  - TC **does not contain** text
  - TC **starts with** text
  - TC **does not start with** text
  - TC **ends with** text
  - TC **does not end with** text

- 数值列 “NC” 选项：
  - NC **is null**
  - NC **is not null**
  - NC **equals** #
  - NC **does not equal** #
  - NC **is less than** #
  - NC **is more than** #
  - NC **is at most** #
  - NC **is at least** #

**注意：** 若通过 CSV 上传创建 Analysis Table，数值列可能显示为文本列。请创建 Analysis View，然后用 “Convert column formats” 变换将列从文本转为整数或小数格式，即可使用基于数值的筛选选项。

### 添加筛选与筛选条件

筛选按列表顺序应用于 Analysis Table 或 Analysis View。向 Analysis Table 添加筛选或条件：

1. 在表标题下点击蓝色 **+ Add filter**
2. 用下拉选择要应用筛选的列，并选择筛选条件
   - **注意：** 每个筛选只能指定一列；可用 And/Or 逻辑为该列设置多个条件，且该列在该视图上只能有这一份筛选
3. 要向筛选添加更多条件，在筛选配置弹窗中点击蓝色 **+ Add conditions** 并配置条件
4. 点击 **Apply**

![Screenshot 2025-05-01 at 10.50.31 AM.png](https://help.benchling.com/hc/article_attachments/36275865778445)

### 编辑筛选或筛选条件

1. 点击 Analysis Table 标题下的目标筛选
2. 按需修改筛选与条件
3. 点击 **Apply** 保存更改

### 移除筛选或筛选条件

1. 要移除整个筛选，点击筛选末尾的 **x 按钮**
2. 要移除一个或多个条件，进入该筛选，点击条件旁的 **垃圾桶** 图标
3. 点击 **Apply**

## 从已完成的 Analysis 捕获数据

有多种方式从已完成的 Analysis 捕获数据，见以下小节。

### 复制与下载 Analysis View 数据

可从 Analysis View 或 Analysis Table 复制数据，或导出为 .csv。

Analysis Views 操作说明：

1. 选择要复制或下载的 Analysis View
2. 点击表右上角 **... 按钮** 显示更多选项
3. 选择 “Copy to clipboard” 可复制最多 **前 1,000 行**
4. 选择 “Download as CSV” 下载 Analysis View 的 CSV 文件

### 从 Analysis 表创建输出

有多种方式从 Analysis 表创建输出。均以点击 Analysis 上的 **Create outputs** 按钮开始。这将打开 “Output from analysis” 界面，可选择不同 Analysis 表、定义输出类型，并在右侧预览输出。一旦为图表或表创建输出，该 Analysis 视图（以及该视图上游的相关表）将被锁定。

![](https://help.benchling.com/hc/article_attachments/36096496987277)

### 将分析表保存到 Results schemas

由于 Results schemas 预定义了特定列集，将分析表保存到 Results schema 可便于与 schema 中其他数据一起查询。从 Benchling Analysis Table 操作：

1. 在 Outputs 菜单中，用左侧复选框选择要保存的表或图表
2. 用所选表旁的下拉选择 **As result**
3. 在打开的弹窗中选择要保存到的 Results schema
4. 用下拉将表列映射到 Results schema 字段
5. 选择要保存到的 Entry 或 Worksheet，然后点击 **Create outputs**

### 将图表嵌入 Notebook 条目

可将图表与表直接嵌入 Notebook 条目，从而把实验结果视觉产出与实验过程及其他信息放在同一位置。

1. 在 Outputs 菜单中，用左侧复选框选择要嵌入的图表
2. 用所选图表旁的下拉选择 **As chart**
3. 选择要发送到的 notebook 条目。在 **Entry** 框中按名称搜索
4. 要嵌入这些项目，需在条目中创建一个或多个新 Section
   - 用 **+ Add Section** 按钮创建任意数量的 section。点击六点 ![](https://help.benchling.com/hc/article_attachments/36096496989965) 图标，可将待嵌入项拖放到偏好的 section
5. 点击 **Create Outputs**

所选图表与表现已在 notebook 条目中！完成后，通向所嵌入项的数据源与分析步骤将被锁定，使 Analysis 中的视图与嵌入 Notebook 的内容一致。

![](https://help.benchling.com/hc/article_attachments/36096515960589)

若不想直接把图表嵌入 Notebook 条目，可 @-mention 一个 Analysis。输入 “@” 调出搜索并开始输入分析名称，点击以创建标签。

完成后，链接会以带时间戳的形式出现在关联分析左侧边栏的 Outputs 部分，便于追溯分析何时被链接到 notebook 条目。

对于拥有 [Bioprocess](https://help.benchling.com/hc/en-us/articles/26951387803661) 权限的客户，也可将图表与输出嵌入 Worksheets。流程与嵌入 Notebook 类似，但在 Worksheets 中图表会嵌入到新的 post-run Step。

### 创建 Datasets

Datasets 是另一种可创建的输出形式。它们是可搜索的半结构化表格式数据对象，存放在文件夹中而非 schemas 内。[了解 Datasets](https://help.benchling.com/hc/en-us/articles/35405512657037-What-is-a-Dataset)。

1. 在 Outputs 菜单中，用左侧复选框选择要做成 Datasets 的表
2. 用所选表旁的下拉选择 **As Dataset**
3. 选择要发送到的 notebook 条目。在 **Entry** 框中按名称搜索
4. 要嵌入这些项目，需在条目中创建一个或多个新 Section
5. 点击 **Create Outputs**

## 在 Benchling Insights 中重复 Analysis

在 Benchling Analysis 中，你可在新数据集上复用数据变换与图表配置以重复分析，从而节省时间并保证一致性。可通过复制已有分析、替换数据源，或应用已保存模板完成。以下各节介绍每种方法，帮助你用更新后的数据高效重跑分析。

### 复制并替换 Analysis

若想复用整套设置（含数据变换与可视化）但使用新的或更新的数据源，或你仅有 Standard Analysis 权限，复制已有分析会很有用。复制 Analysis：

1. 打开要复制的分析
2. 点击分析右上角 **... 菜单**
3. 选择 **Duplicate**
4. 在弹出窗口中为副本选择新位置与名称
5. 新分析将命名为 **“Copy of [原分析名称]”**，与原分析相同但相互独立
     
   ![Screenshot 2025-05-01 at 11.32.43 AM.png](https://help.benchling.com/hc/article_attachments/36275865787661)
6. 复制后，若要用新数据替换原数据表，打开副本并进入要替换的表
7. 点击分析表旁的 **... 菜单**
8. 选择 **Replace Table**
9. 选择引入新数据的方法（如 CSV 上传、Registry、Notebook 条目或其他来源）
10. 新数据将替换旧表，所有关联变换会在新数据上自动重跑

![Screenshot 2025-05-01 at 11.34.43 AM.png](https://help.benchling.com/hc/article_attachments/36275865790093)

## Analysis 模板

对于更标准化的工作流，将分析保存为模板，可反复对不同数据应用相同变换与可视化。

***注意：** Analysis 模板仅对拥有 Advanced Analysis 权限的用户可用。*

将 Analysis 保存为模板：

1. 用必要的变换与可视化配置分析
2. 点击分析右上角 **... 菜单**
3. 选择 **Save as Analysis Template**
     
   **![Screenshot 2025-05-01 at 11.38.34 AM.png](https://help.benchling.com/hc/article_attachments/36275838589325)**
4. 命名模板，并用下拉保存到 **Template Collection**
5. 对每个 Analysis Table，选择其为可变（每次用新数据）或静态（使用原数据）
   - **Variable**：每次应用模板时可选择新数据，适合数据频繁变化的场景
   - **Static**：使用模板中的原始数据表，适合板图或接受标准限值等结构稳定的数据
6. 用复选框选择要导出的表
7. 点击 **Create**
8. 要应用 Analysis Template，打开新 Analysis，用 **+ 按钮** 引入所需全部表
9. 表填充完成后，点击 **... 菜单** 并选择 **Apply Analysis Template**
     
   **![Screenshot 2025-05-01 at 11.42.23 AM.png](https://help.benchling.com/hc/article_attachments/36275838591501)**
10. 用下拉从 Template Collection 选择已保存模板
11. 将数据映射到模板并点击 **Save**
12. 完成映射后，点击 **Apply**，在新数据上运行已保存的变换与视图

模板创建后不可再更改，因此可确信使用该模板的任何分析都遵循相同步骤。此外，若将输出创建模板化，一旦应用模板，参与创建输出的全部相关表都会被锁定。

**说明与限制**

- 若对给定 Recipe Template 自动生成的 Bioprocess 数据表应用 Analysis Template，表结构会可预期地保持相同表类型与列名。
- 模板创建后不可编辑。
- 若对其他数据表应用 Analysis Template，需将新数据映射到模板输入。数据不必完全一致，但必须进行列映射。在所有输入表的全部预期列映射完成前，无法运行 Analysis Templates。
- Analysis Templates 限制为 500 个步骤。

## 创建 Advanced Analysis 模板的权限

Advanced Analysis 模板遵循与 Notebook 条目模板相同的权限结构。权限通过 **template collections** 管理，控制谁可在 Benchling 中创建与访问模板。

**谁可以创建 Analysis 模板？**

在某个 template collection 中有权创建 Notebook 条目模板的用户，也有权在同一 collection 中创建 Advanced Analysis 模板。

**注意：** 没有单独仅针对 Advanced Analysis 模板创建的权限。

## 自定义代码（Custom Code）

Custom Code 是 Automation Designer 中的一种步骤类型，可将 Python 脚本直接嵌入 Analysis 工作流。适用于内置免代码变换不足的场景——例如解析不受支持的仪器文件格式、执行高级统计计算，或构建专用可视化。Custom Code 接受文件与数据集作为输入，并在同一 Analysis 流程图中返回数据集、文件或图表作为输出。

![](https://help.benchling.com/hc/article_attachments/46068367618957)

## 了解 Custom Code 如何工作

Custom Code 作为 Automation Designer 流程图中的步骤运行。每个步骤接受一个或多个输入——文件、数据集或二者混合——并通过 IOData 类返回一个或多个输出。输出可以是 pandas DataFrame（作为数据集返回）、BytesIO 对象（作为文件返回）或图形（作为图表返回）。

每个 Custom Code 步骤的入口是 custom_code 函数：

```
def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
```

所有输出必须以 IOData 对象列表返回，即使只有一个输出：

```
return [IOData(name="MY_OUTPUT", data=result_dataframe)]
```

IOData 类有两个属性：

- name：输入或输出对象的字符串标识符
- data：BytesIO（文件）、pandas DataFrame，或 Plotly graph_objects Figure 之一

当多个输入连接到同一 Custom Code 步骤时，按建立连接的顺序到达。可按索引或按名称引用。支持混合输入类型——可将数据集与文件同时连接到同一步骤。

执行出错时，编辑器会显示行号与异常消息，帮助定位并修复问题。

若 Custom Code 保存在 Analysis 模板中，或作为 Analysis 输出应用，则 Custom Code 步骤会被锁定且不可编辑。

## 创建 Custom Code 步骤

向 Analysis 添加 Custom Code 步骤：

1. 打开 Analysis，点击右上角 **Flowchart Editor** 按钮
2. 找到要作为输入的数据集或文件步骤——可以是输出数据集或文件的任何步骤，包括先前的变换或导入步骤
3. 悬停并点击该输出步骤，从步骤类型菜单选择 **Custom Code**
4. 若要向该步骤传入多个输入，从每个输入步骤再画连线到同一 Custom Code 步骤
5. 在代码编辑器的 custom_code 函数中编写或粘贴 Python 脚本——编辑器会预加载默认导入

   ![](https://help.benchling.com/hc/article_attachments/46068415401485)
6. 点击 **Save** 保存脚本，然后运行该步骤

![Screen Recording 2026-05-12 at 12.19.55 PM.gif](https://help.benchling.com/hc/article_attachments/46068367621645)

## 理解 Custom Code 中的错误消息

执行出错时，Custom Code 会直接在流程图的该步骤上显示错误，包含脚本中的行号与异常消息，便于在不离开 Automation Designer 的情况下定位并修复。

常见错误原因包括类型不匹配（例如把 decimal.Decimal 传给 NumPy 函数却未先转为 float）、用不存在的索引引用输入，或返回的输出未包装在 IOData 对象列表中。

## 用 Custom Code 完成常见工作流

### 解析仪器文件

用 Custom Code 读取并解析 Benchling Connect 开箱连接器尚不原生支持的仪器数据文件。

1. 创建新 Analysis
2. 在 Flowchart Editor 中点击 **Add Source Step**，选择 **Import file from data catalog**
3. 在右侧边栏从数据目录选择文件并指定文件名
4. 从已导入文件步骤添加新步骤，选择 **Custom Code**
5. 编写代码解析输入文件，并将结果作为 IOData 实例列表返回
6. 点击 **Save**

![File Parsing.gif](https://help.benchling.com/hc/article_attachments/46068415402125)

### 变换、合并与计算数据

应用变换、合并或 join 数据集，并执行超出 Analysis 内置变换步骤的计算。

1. 在 Flowchart Editor 中，从数据集和/或文件步骤添加新步骤，选择 **Custom Code**
2. 在 custom_code 函数中编写变换逻辑
3. 将修改后的数据作为 IOData 实例列表返回
4. 点击 **Save**

![Statistics.gif](https://help.benchling.com/hc/article_attachments/46068415403533)

### 创建高级可视化

使用 Plotly graph objects 构建自定义图表与图形。适用于标准 Analysis 图表类型无法提供的专用可视化，例如色谱图、带自定义标注的热力图或多面板图。

1. 在 Flowchart Editor 中，从数据集和/或文件步骤添加新步骤，选择 **Custom Code**
2. 编写代码，用 plotly.graph_objects.Figure 构建 Plotly Figure
3. 将图形作为 IOData 实例列表返回
4. 点击 **Save**

![Advanced Visualizations.gif](https://help.benchling.com/hc/article_attachments/46068415404685)

### 生成新的输出文件

使用 BytesIO 创建新文件作为输出——例如格式化 CSV 导出、仪器指令列表或其他文件类型。

1. 在 Flowchart Editor 中，从数据集和/或文件步骤添加新步骤，选择 **Custom Code**
2. 编写代码构建 BytesIO 文件对象
3. 将文件作为 IOData 实例列表返回
4. 点击 **Save**

![Generate Output Files.gif](https://help.benchling.com/hc/article_attachments/46068415405453)

## 了解支持的 Python 包

Custom Code 运行在由 Benchling 管理、预装精选 Python 包的环境中。可直接在代码中 import 下表任一包。不能通过 pip 安装额外库。

| 包 | 版本 | 说明 |
| --- | --- | --- |
| allotropy | 0.1.105 | Benchling 提供的 Python 库，用于将仪器数据转换为 Allotrope Simple Model (ASM) |
| biopython | 1.86 | 生物序列分析 |
| lmfit | 1.3.4 | 非线性曲线拟合 |
| matplotlib | 3.10.3 | 作图与可视化 |
| numpy | 2.2.4 | 数值计算 |
| openpyxl | 3.1.5 | Excel 读写 |
| pandas | 2.2.3 | 数据操作与分析 |
| plotly | 5.22.0 | 交互式作图与可视化 |
| pyarrow | 19.0.1 | Apache Arrow 集成 |
| pydantic | 1.10.21 | 数据校验与设置 |
| seaborn | 0.13.2 | 作图与可视化 |
| scikit-learn | 1.6.1 | 机器学习 |
| scipy | 1.15.2 | 科学计算 |
| statsmodels | 0.14.4 | 统计建模 |

要查看租户中可用的精确包版本，可在 Custom Code 步骤中运行以下代码：

```
from io import BytesIO
import pandas as pd
from typing import NamedTuple
import plotly.graph_objects as go
from importlib.metadata import distributions

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure


def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    
    packages = [{"package": d.name, "version": d.version}
    
    for d in distributions()]
    
    df = pd.DataFrame(packages).sort_values("package")
    
    df = df.reset_index(drop=True)
    
    return [IOData("packages", df)]
```

## 遵循 Custom Code 最佳实践

#### 生物序列处理

对 DNA、RNA 与蛋白质序列操作，优先使用 Biopython，而非通用字符串处理。Biopython 提供内置序列校验、密码子使用表、比对工具，以及对歧义碱基的稳健处理。

#### 曲线拟合

对 4PL 或 5PL 等非线性曲线拟合，优先使用 lmfit，而非 scipy.optimize。lmfit 参数处理更直观，误差估计更好，边界定义更易，并内置拟合报告。

#### 与 NumPy 的类型兼容

Benchling 数据可能包含 decimal.Decimal 类型。NumPy 函数不直接支持 Decimal。在使用 numpy、scipy 或 scikit-learn 函数前，请始终将 Decimal 转为 float：

df['column'] = df['column'].astype(float)

### 查找示例代码

Benchling 维护公开的 Custom Code 示例 GitHub 仓库，覆盖文件解析、数据变换、可视化与文件生成。可用作自己脚本的起点或可运行实现参考。

仓库：<https://github.com/benchling/app-examples-python/tree/main/examples/custom-code>

要使用示例：

1. 浏览仓库中的 examples/custom-code-AD/ 目录
2. 找到匹配用例的片段，或改编为起始模板
3. 将脚本复制到 Automation Designer 的 Custom Code 编辑器
4. 按你的数据与目标输出改编代码
5. 在 Analysis 中运行并验证

## Analysis 模板中的 Custom Code 步骤

可将包含 Custom Code 步骤的 Analysis 保存为 Analysis 模板。此时每个 Custom Code 步骤内的 Python 脚本会作为模板的一部分保存。从该模板新建 Analysis 的用户将看到脚本预填好，可直接运行或修改。

用户从模板新建 Analysis 时，Custom Code 步骤会出现在流程图中，代码编辑器中已加载保存的脚本。

## 迁移包含 Custom Code 步骤的 Analysis 模板

包含 Custom Code 步骤的 Analysis 模板支持配置迁移。将模板从一个租户迁移到另一个租户时，每个 Custom Code 步骤内的 Python 脚本会自动迁移——无需手动重新录入。

注意：请检查模板，确保脚本不包含对新 Analysis 可能无效的硬编码文件、数据集或租户特定值引用。

## 了解 Custom Code 的限制

使用 Custom Code 时请注意以下约束：

- 每次运行执行时间限制为 15 分钟
- 执行环境无通用网络访问
- 不能安装自定义库——仅可使用上表预装包
- Custom Code 执行环境中不支持 Benchling SDK 与 API
- Custom Code 步骤无版本控制——仅保存脚本的最新版本。代码变更历史可从审计日志下载
- 配置迁移 Analysis 模板时，可变输入文件与已连接数据源不会迁移，需在目标租户中重新连接

#### 本文是否有帮助？

是
否

还有问题？[提交请求](https://help.benchling.com/hc/en-us/requests/new)
