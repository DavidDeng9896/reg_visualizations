# Benchling Automation Designer 帮助文档图片/GIF 视觉分析笔记

> 分析对象：Benchling 帮助中心两篇关于 **Automation Designer**（no-code/low-code 流程图式数据分析工具）的文档中的 22 个图片/GIF 附件。
> 原始文件：`docs/reference/raw/images/`；GIF 抽帧：`docs/reference/raw/images/frames/`。
> 分析日期：2026-07-22。所有 UI 标签均按画面中的英文原文记录。

---

## 通用 UI 结构（多张图反复出现，先行总结）

- **画布（Flowchart canvas）**：点阵背景的无限画布，左下角缩放控件（`- 百分比 +`、适配、全屏图标），右下角 `SPLIT WORKSPACE` 水印。
- **顶部工具栏**：面包屑（如 `Benchling Connect Demo / General /` + 分析名）、右侧按钮组 `...`（更多）、`Flowchart`、`Send output`、`+ Add data`（蓝色主按钮）。空画布中央有 `Add source step` 提示按钮。
- **节点（step node）**：圆角卡片，头部为步骤名+类型图标；配置完成显示绿色对勾 ✓，未配置显示黄色警告 ⚠ 及文字 `Waiting on step input or configuration.`；执行中显示旋转 spinner。节点体内分 `Inputs` / `Outputs` 两组端口，右侧/左侧有圆形连接点，拖出可形成带图标的连线（图标指示数据类型：回形针=文件、表格=表格/dataset）。
- **右侧面板**：添加步骤（`Add source step` / `Add step`）与步骤配置均在右侧抽屉式面板完成，底部固定 `Cancel` / `Next` 或 `Save` 按钮，右上角有"展开为全屏"图标。
- **左侧面板 `ANALYSIS DATA +`**：树形结构展示 源节点 → 处理节点 → 输出产物（dataset 表格图标 / chart 图表图标 / 文件回形针图标），每个节点下可 `+ New view`。点击产物即在主区打开表格/图表/文件预览视图。
- **配置保存后**：点击节点会弹出**只读**的配置摘要弹窗（灰底字段不可编辑）。
- **左下角常驻按钮**：`Connect with external tool`。

---

## 附件 1 · 46077729577101.png（静态，750×1724）

**章节**：Add source data（"Add source step" 面板）
**画面内容**：右侧"Add source step"面板全高截图。顶部搜索框 `Search...`；下方为分类的源步骤目录：

- **Analysis templates** → `Define template variables`
- **Create file** → `Import files from data catalog`
- **Create table** → `Create table from dataset`、`Create table from Insights block`、`Create table from Registry Schemas`、`Create table from uploaded CSV`
- **Combine existing tables** → `Join tables`、`Union tables`
- **Look up from existing table** → `From look up`
- **External data** → `Connect with external tool`

面板底部有 `Step descriptions` 开关（toggle，控制是否显示每步说明文字），最底部 `Cancel` / `Next` 按钮。右下角有 Benchling 蓝色圆形帮助/chat 悬浮按钮。

**功能点**：源数据步骤共 6 大类 10 种；步骤可搜索；可显示/隐藏步骤描述。

## 附件 2 · 46077706171533.png（静态，355×255）

**章节**：Connect 步骤菜单（"Convert instrument files to ASM files" 上下文）
**画面内容**：`Connect` 分类下的 7 个转换/传输步骤菜单：

1. `Convert ASM files to CSV files`
2. `Convert CSV files to dataset`
3. `Convert instrument files to ASM files`
4. `Convert JSON file to dataset`
5. `Convert JSON file to datasets and JSON metadata files`
6. `Extract or remove lines from files`
7. `Send to connection`

**功能点**：内置文件格式转换管线（仪器原始文件 → ASM → CSV → Dataset；JSON → Dataset/元数据文件）；文件行级抽取/删除；可回传结果到 Benchling Connect connection。

## 附件 3 · 46077729579021.png（静态，1920×992）

**章节**：Convert CSV files to Dataset（流程图画布总览，"File Imports" 分析）
**画面内容**：完整画布，四个节点串联：`Files`（Outputs: Output files）→ `Convert instrument files to ASM files`（Inputs: Input files / Outputs: Output files）→ `Convert ASM files to CSV files`（Inputs: Input files / Outputs: Output files）→ `Convert CSV files to dataset`（Inputs: Input files / Outputs: Dataset）。全部节点绿色对勾。连线中点有回形针图标。顶部 tab 名 `File Imports`，面包屑 `Benchling Connect Demo / General /`；左下角缩放显示 130%。

**功能点**：典型的仪器文件 ingest 管线（三段转换链）；节点卡片显式列出输入/输出端口及数据类型图标（回形针=文件，表格=Dataset）。

## 附件 4 · 46077706172173.gif（GIF，3456×1980，424 帧）

**章节**：Add input tables（演示 Create table 四种来源菜单）
**画面内容**：在名为 `EXAMPLE_ANALYSIS` 的空分析中，点击 `+ Add data` → 右侧打开 `Add source step` 面板 → 鼠标在菜单中上下滚动浏览各分类（Analysis templates / Create file / Create table 四项 / Combine existing tables / Look up from existing table / External data）→ 最终悬停高亮在 `Create table from uploaded CSV` 上。菜单内容与附件 1 完全一致。演示了面板内搜索框和 `Step descriptions` 开关的位置。

**功能点**：入口交互（`+ Add data` 按钮 / 画布 `Add source step` 提示）；步骤目录浏览与悬停高亮。

## 附件 5 · 46077706172813.png（静态，1100×1772）

**章节**：Create table from dataset 配置面板
**画面内容**：配置面板标题 `Create table from dataset`，右上角展开图标。字段：`Dataset *`（必填，对象搜索选择框，下拉占位文案 `Search for an item.`）；下方一个 `Text` 输入框（table name）。底部 `Cancel` / `Save`。

**功能点**：以已有 Dataset 为源建表；Dataset 通过全局对象搜索选择。

## 附件 6 · 46077729580045.png（静态，1098×1768）

**章节**：Create table from Insights block 配置面板
**画面内容**：标题 `Create table from Insights block`。分组 `Dashboard and query`：`Dashboard`（`Select dashboard...` 下拉）、`Block`（下拉，未选 dashboard 前禁用置灰）；`Table name *`（必填文本框）。底部 `Cancel` / `Save`。

**功能点**：可把 Benchling Insights（BI 仪表盘）中某个 block 的查询结果作为输入表；Dashboard → Block 两级级联选择。

## 附件 7 · 46077706173325.png（静态，1098×1770）

**章节**：Create table from Registry Schemas 配置面板
**画面内容**：标题 `Create table from Registry Schemas`，副标题 `Registry schema query`。四步向导式编号列表：

1. `Select Registry schema` —— `Entity schema` 下拉（`Select a schema...`）+ 右侧 `Filters` 按钮
2. `Select columns`
3. `Add Results`
4. `Name table` —— `Table name` 输入框

底部 `Cancel` / `Save`。

**功能点**：对 Registry 实体 schema 做查询建表；支持过滤（Filters）、选列、附加 Results（实验结果）数据；步骤式引导配置。

## 附件 8 · 46077706177165.png（静态，1100×1772）

**章节**：Create table from uploaded CSV 配置面板
**画面内容**：标题 `Create table from uploaded CSV`。`Upload CSV file *`：虚线拖拽上传区（云上传图标 + `Drag and drop to upload or` + `Choose a file` 按钮）；`Table name *` 必填文本框。底部 `Cancel` / `Save`。

**功能点**：本地上传 CSV 直接建表（拖拽或文件选择器）。

## 附件 9 · 46077706177805.gif（GIF，3456×1980，1433 帧）

**章节**：Convert CSV files to a dataset 操作过程
**画面内容**（关键帧）：

1. 画布上已有 `CSV_File` 源节点（Outputs: Output files，绿色对勾）。点击其输出点 → 右侧 `Add step` 面板（注意：下游步骤面板与源步骤面板不同），分类包括 **Code** → `Custom code`；**Connect** → 7 个转换步骤（同附件 2）。
2. 点击 `Convert CSV files to dataset` → 画布中央 `LOADING...` → 新节点出现并自动与 CSV_File 连线，节点 ⚠ 待配置。
3. 右侧配置面板字段：`Dataset name *`（输入演示 "Dataset…"）、`CSV delimiter`（下拉，默认 `Comma (,)`）、`Custom CSV delimiter`（文本，带 ? 帮助图标）、`Date locale`（下拉，默认 `English (US)`）、`Spreadsheet sheet name`（文本，带 ? 图标）→ `Save`。
4. 保存后节点变绿 ✓；再次点击节点弹出**只读**配置摘要弹窗（所有字段灰底锁定）。

**功能点**：CSV→Dataset 转换的完整配置项（分隔符/自定义分隔符/日期区域/Excel sheet 名）；下游 `Add step` 目录含 Code 与 Connect 分类；配置只读回看。

## 附件 10 · 46077729587853.gif（GIF，3456×1980，2096 帧）

**章节**：Define template variables 操作过程
**画面内容**：

1. 添加 `Define template variables` 源节点（⚠ 待配置），右侧 `Define template variables` 面板，子标题 `Define variables`。
2. 字段：`Name`（输入 `Threshold`）；`Multi-select` 复选框 `Allow multiple values`；`Type` 下拉（初始 `None`，警告条 `Select a variable type.` → 选择 `Integer`）；随后出现 `Minimum value`（500）、`Maximum value`（15000）、`Required` 下拉（Yes/No，演示选 No）、`Value *` 默认值输入框（600）。
3. 提示条（信息图标）：`The value above is replaced each time the template is applied.`；底部 `+ Add variable` 链接（可定义多个变量）；校验警告 `Invalid value for Threshold`。
4. 保存后节点改名为 `Variables dataset`（绿色 ✓）；点击节点弹出只读配置摘要。

**功能点**：模板变量系统——变量名、类型（Integer 等）、多选开关、min/max 约束、必填开关、默认值；一个变量节点产出 "Variables dataset"，可在运行时被替换，实现分析模板参数化。

## 附件 11 · 46077729588877.png（静态，1098×1774）

**章节**：Look up entity and plate metadata 配置面板
**画面内容**：标题 `Look up`，两步向导：

1. `Select table to look up from` —— 下拉已选 `sample_results`
2. `Configure look up` —— `Name table *`；`Select look up column *`（`Select column` 下拉，带 ? 图标）；`Select identifier format *`（下拉，当前值 `Id`，带 ? 图标）；`Select entity schema`（`Select a schema...` 下拉，带 ? 图标）

底部 `Cancel` / `Add table`。

**功能点**：Look up 步骤可按某列值（指定标识符格式，如 Id）去 Registry entity schema 中查找并回填实体/孔板元数据列，实现数据富化（enrichment）。

## 附件 12 · 46082223473933.png（静态，1920×992）

**章节**：Custom Code 步骤总览（流程图中的 Custom Code 节点）
**画面内容**：分析 `Custom Code in Automation Designer`。左侧 `ANALYSIS DATA +` 树：`Data` → `Custom code`，`+ New view`。画布：`Data` 源节点（绿 ✓）→ 连线（中点表格图标）→ `Custom code` 节点（⚠ `Waiting on step input or configuration.`）。Custom code 节点端口：**Inputs**: `Input datasets`（表格图标）、`Input files`（回形针图标）；**Outputs**: `Output charts`（柱状图图标）、`Output datasets`、`Output files`、`Standard error`、`Standard output`（后两者均回形针图标），每个输出口有独立连接点。右侧为 `Custom code` 配置面板：`Code` 代码编辑器（见附件 13）+ `Name` 字段 + `Cancel`/`Save`。左下角 `Connect with external tool` 按钮，缩放 146%。

**功能点**：Custom Code 节点的五类输出端口（charts/datasets/files/stderr/stdout）；代码编辑器内嵌在右侧配置面板。

## 附件 13 · 46082223474317.png（静态，537×597）

**章节**：Custom Code 代码编辑器界面（特写）
**画面内容**：`Custom code` 面板中的 `Code` 编辑器（带行号、语法高亮、代码折叠箭头）。预置模板代码：

```python
"""
Supported packages:
allotropy
biopython
lmfit
matplotlib
numpy
openpyxl
pandas
plotly
pyarrow
pydantic
seaborn
scikit-learn
scipy
statsmodels
"""
from io import BytesIO
import pandas as pd
from typing import NamedTuple
import plotly.graph_objects as go

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    raise NotImplementedError("TODO: Return list of IOData")
```

**功能点**：托管 Python 运行时，14 个白名单包；`IOData` 契约（name + BytesIO/DataFrame/go.Figure 三种数据形态）；入口函数 `custom_code(inputs, **kwargs)` 返回 IOData 列表。

## 附件 14 · 46082207188493.gif（GIF，1918×992，665 帧）

**章节**：Custom Code 保存并运行
**画面内容**：

1. 画布只有 `Data` 源节点；点击节点弹出重命名小弹窗（`Name: Data`）。
2. 从 Data 节点输出点拖出连线 → 右侧 `Add step` 面板展示**下游步骤完整目录**：
   - **Code** → `Custom code`
   - **Combine tables** → `Join tables`、`Union tables`
   - **Create table** → `Look up`
   - **Statistics** → `Calculate interpolation`
   - **Transform** → `Add computed column`、`Add window functions`、`Aggregate table`、`Bin data`、`Convert column formats`、`Filter table`、`Find and replace text`、`Format columns`、`Hide columns`、`Pivot table`
3. 选择 `Custom code` → 新节点出现并连线 → 右侧打开代码编辑器（预置模板）→ `Name` 字段 → 点击 `Save`。

**功能点**：下游分析步骤目录（5 大类 17 种，Transform 类 10 种表变换）；拖拽连线即触发"添加下游步骤"；节点可重命名。

## 附件 15 · 46082223475341.gif（GIF，1280×720，1021 帧）

**章节**：File Parsing 工作流示例
**画面内容**：

1. `Text File` 源节点（Outputs: Output files）→ 拖线添加 `Custom code` 节点。
2. 代码编辑器中填入文件解析脚本（片段注释）：`Parse a CSV-formatted text file (Sample, Result, Well) into a DataFrame.`；`Expected input: inputs[0] – IOData with name="sample_results_file" and data=BytesIO containing a CSV with columns: Sample, Result, Well`。头部注释含 `# Packages supported in this template snippet may differ from what is available in Benchling as we expand coverage.`；额外 import `plotly.express as px`。
3. Save 后节点执行（spinner），完成后左侧 `ANALYSIS DATA` 树出现 `Text File → Custom code → sample_results`（表格图标）。
4. 点击 `sample_results` 打开表格视图：列 `Sample`（Aa 文本）、`Result`（# 数值）、`Well`、`Row`、`Column`；底部显示 `96 rows`；表格右上角有图表/编辑/更多操作图标。

**功能点**：BytesIO 文件输入 → DataFrame 输出 dataset；输出产物自动进入 ANALYSIS DATA 树并可预览（带类型图标的表格视图）。

## 附件 16 · 46082223475597.gif（GIF，1280×720，968 帧）

**章节**：Statistics 统计分析工作流示例
**画面内容**：

1. `Assay_Data.csv` 源节点 → `Custom code` 节点。
2. 代码：`from scipy.stats import ttest_ind, f_oneway`；`df = inputs[0].data`；`df['Value'] = pd.to_numeric(df['Value'])`；按 `Group` 列拆分 `Positive_Control` / `Negative_Control` / `Treatment_A` / `Treatment_B`；计算 `# Z-Prime Factor`（`mu_pos`、`sigma_pos`…）。
3. 保存时出现 `LOADING...`；完成后 ANALYSIS DATA 树出现 `statistics_output`。
4. 表格视图：列 `Well`、`Group`、`Value`、`Group_Mean`、`Group_Std_Dev`、`Z_Prime`、`T_Test_P_Value_TreatmentA_vs_Neg`、`T_Test_P_Value_TreatmentB_vs_Neg`、`ANO…`（ANOVA p 值）；96 rows。

**功能点**：scipy 统计检验（t 检验、单因素 ANOVA、Z' 因子）直接写入分析管线；统计量作为新列回写输出表。

## 附件 17 · 46082207189133.gif（GIF，1280×720，1021 帧）

**章节**：Advanced Visualizations 可视化工作流示例
**画面内容**：分析 `Unicorn Chromatogram Visualizations`。

1. 已有管线：`My_Chromatogram_Data`（源）→ `Filter table` → `Convert column formats` → `Hide columns`（均绿 ✓）→ 拖线添加 `Custom code`。
2. 代码亮点：此示例的 Supported packages 列表含 **`benchling-sdk`**；`from benchling_sdk.benchling import Benchling`；`from scipy.signal import find_peaks`；函数签名为 `def custom_code(inputs: list[IOData], benchling: Benchling | None = None) -> list[IOData]:`（**Benchling SDK 客户端作为可选参数注入**）。用 plotly 构建多 y 轴色谱图：`Chromatogram with Abs, pH, Solvent Conc Traces`，x 轴 `Retention Volume (mL)`，y 轴 `Absorbance (mAU)` / `pH` / `Conc. B (%)`（overlaying y2/y3）；`find_peaks` 设 10% max absorbance 高度阈值找峰；`return [IOData(name="Chromatogram", data=fig)]`。
3. 运行后 ANALYSIS DATA 树出现 `Chromatogram`（图表图标）；点击打开图表视图（标题 `Chromatogram`）。

**功能点**：go.Figure 直接输出为交互式 chart 产物；复杂多轴科学图表（色谱）；可在代码内通过 benchling-sdk 回查平台数据；峰值检测等信号处理。

## 附件 18 · 46082223476621.gif（GIF，1280×720，1085 帧）

**章节**：Generate Output Files 生成输出文件工作流示例
**画面内容**：

1. 同附件 16 的统计代码，但结尾改为：`output_buffer = BytesIO()` → `df.to_csv(output_buffer, index=False, encoding='utf-8')` → `output_buffer.seek(0)` → `return [IOData(name="statistics_output.csv", data=output_buffer)]`。
2. 执行期间界面分屏：左侧 Code，右侧 `Output file` 预览区（spinner）；顶部出现提示 tooltip `Expand sidebar to view data preview`。
3. 完成后 ANALYSIS DATA 树出现 `statistics_output.csv`（回形针文件图标）；点击打开文件预览：完整表格（Well/Group/Value/Group_Mean/Group_Std_Dev/Z_Prime/T_Test_P_Value_TreatmentA_vs_Neg/T_Test_P_Value_TreatmentB_vs_Neg/ANOVA_P_Value_All_Groups）。

**功能点**：BytesIO + 文件名（含扩展名）即生成可预览的输出文件；代码节点执行时提供侧边数据预览。

## 附件 19 · 46077729590797.gif（GIF，1154×720，1097 帧）

**章节**：Run schema 配置（Variable input tables / dataset 列映射路径）
**画面内容**：Run schema 设置页（Settings → AUTOMATION SCHEMAS → Run schemas），分节配置：

1. 页面区段：`Connection schema`、`Notebook preferences`（`Allow creating new runs from the notebook`、`Allow inserting runs from inbox in the notebook` 勾选框）、`Additional preferences`（`Record Equipment`）、`Run fields +`、`Input file configurations +`、`Output file configurations +`。
2. Output file configurations 的 7 步编号配置：① `Configure the display name`（输入 "Instr…"=Instrument File）；② `Configure output table`：`Benchling action *` 复选组（`Register and/or update entities`、`Transfer samples`、`Record results`、`Record dataset`、`Perform plate transfer`）、`Output table display *`（`One row per sample`）、`Output table sorting *`（`Alphabetical order`）、`Entity schema *` → `Configure entity schema` 链接；③ `Apply transforms to the output file`（`Set transforms`）；④ `Configure column mapping`（`Set columns` + `Configure dataset` 链接）；⑤ `Configure delimiter`（`Comma (,)`）；⑥ `Configure data locale`（`English (US) | 1,234,567.89 | 01/25/2023`）；⑦ `Configure dataset`：`Dataset name` 用 chip 拼命名规则（`Run schema name` + `Creation date` + `Creation time`，可编辑）。页底 `Update` / `Edit as JSON`。
3. 点击 `Configure dataset` 打开两步向导弹窗：Step 1 `Set dataset columns`（`Copy column headers from file` 按钮；Column / Column type / Required? 表格；`+ Add Column`；演示列 sepal_length、sepal_width、petal_length、petal_width、variety，类型 Text、全勾 Required）→ Step 2 `Set analysis template (optional)`：说明文案 `Optionally, select an analysis template to be automatically applied to the dataset generated by this run. The template selector is pre-filtered to show only templates with a single variable input.`；`Template table`（Iris Data）与 `Analysis template` 下拉（选项含 `Connect → Analysis Analysis Template`、`My Template 2.13.25`、`2-7 Chart and Regression`、`2-7 Multiple Outputs`、`Connect -> Analysis E2E`、`Fluorescamine Protein Quantification`、`Fluorescence Interpolation Analysis (Plate Reader)`、`Unicorn Traces`、`Ice Cream Regression Template With Column Types` 等）；`Template column ↔ Dataset column` 逐列映射下拉；右侧显示 Iris Data 表预览（1-100 of 150 rows）。`Back` / `Done`。
4. 回到页面，`Configure column mapping` 下出现 `5 columns mapped` 摘要表（列名 + 类型 Decimal/Text）；点 `Update` → 绿色 toast `Updated schema successfully`。

**功能点**：Run schema 输出文件配置极其完整（显示名、回写动作、表格展示/排序、transforms、列映射、分隔符、locale、dataset 命名模板）；dataset 列可从文件表头复制；可绑定 analysis template 实现"run 生成 dataset 后自动触发分析"，并做模板列↔数据集列映射；schema 支持 `Edit as JSON`。

## 附件 20 · 46077706186381.gif（GIF，1920×916，145 帧）

**章节**：执行 Run（Retrieve Data / Process Data）
**画面内容**：Notebook Entry `Automated Connect → Analysis Demo`（EXP25000187，In progress），含 protocol 区块 `Process & Analyze Data` 和 `Send the analyzed data for review`。

1. Run 组件 `[Demo] Automated Connect → Analysis Run`：字段 `Creator`（Nari Kang）、`Created At`（2/28/2025 06:21 AM）、`Connection`（`[Demo] Plate Reader Connection` chip）、`Studies`；`Instrument File` 区：`Output` 按钮组 `Retrieve data` / `Process all`，`Additional file` → `Upload file`。
2. `Output: Instrument File` 区：`Status`（`Processing...` → `Complete`）、`Output file` chip（`Example_Iris_Data.csv`）、复选框 `Skip rows with errors`、Dataset 行显示分析 run 链接（`Connect → Analysis Analysis Template / [Demo] Automated Connect → Analysis Run_a1784ef0-…`）。
3. 执行过程 toast 序列：`Analysis sending data...`（进度条）、`Text content is being inserted into the document.` → `...has been inserted...`、`New content is being inserted...` → `...has been inserted...`、最终 `Analysis completed`（带 `Open` 按钮）。
4. 结果自动插入 Entry：`Charts` 区块出现散点图（petal_length × petal_width，按品种着色）和 `Average measurements` 分组柱状图（x=Variety: Versicolor/Setosa/Virginica，图例 sepal_length/sepal_width/petal_length/petal_width），以及 iris 数据表（`Data output from Connect → Analysis Analysis Template / [Demo] Automated Connect → Analysis Run_…`）。

**功能点**：Run 从 Connection 拉取仪器数据（Retrieve data / Process all）；处理状态机与错误行跳过；分析结果（dataset、图表）自动回写插入到 Notebook Entry；完成通知可一键 Open 查看。

## 附件 21 · 46077706187277.png（静态，1920×992）

**章节**：Run schema 配置截图（Input Files / Static tables / variables 路径）
**画面内容**：Settings → AUTOMATION SCHEMAS → `Run schemas` → `Test File + Variable Run` 编辑页（`RUN SETTINGS` / `ACCESS POLICIES` 两个 tab；右上 `Duplicate schema`、`Export ▾`）。

- `Name *`：Test File + Variable Run；`Owner`：Nari Test；`System name *`：test_file_variable_run
- `Connection schema`：Select... 下拉
- `Analysis template`（带 ? 图标，tooltip 全文）：`Select an analysis template for the run to execute. Compatible analysis templates can have file inputs, static tables and variables; analysis templates with variable tables are not supported.`；下方输入框（值 `Template with File & V…`）及 `Configure default data source filters` 链接
- `Analysis template fields` 表格：列 `Analysis template fields` / `System name` / `Required` / `Multi-select` / `Definition`；示例行 `Variable`（system name `anatmplvar_3n_c_0iweh_f_e`，Required ✓，Definition `# Integer`）
- `Run fields +` 表格：`This schema does not have any run fields`；`Add field` 按钮
- 左侧设置导航：NARI TEST REGISTRY SETTINGS（General/Dropdowns/Entity schemas/Container schemas/Box schemas/Plate schemas/Location schemas/Label printing）、FIELDSETS、INVENTORY SETTINGS、UNIT DICTIONARY、TEMPLATE COLLECTIONS、REVIEW SETTINGS、AUTOMATION SCHEMAS（Connection schemas/Instrument gateways/Run schemas）、RESULT SCHEMAS、WORKFLOW SCHEMAS
- 底部 `Update` 按钮

**功能点**：Run schema 绑定 analysis template 的兼容规则（支持 file inputs、static tables、variables；**不支持 variable tables**）；模板字段自动生成带 system name/必填/多选/类型的字段清单；可配置默认数据源过滤；schema 可复制、可导出。

## 附件 22 · 46077729595277.gif（GIF，1280×720，1726 帧）

**章节**：执行 Run（Execute Automation，含文件来源选择）
**画面内容**：Notebook Entry（EXP25000084，In progress）。

1. 插入的 run 组件 `Test File + Variable Run`：`Variable *`（占位 `Integer Value`）、`File *`（`Select files` / `No file selected`）；右上 `Insert from inbox` 与 `Create` 按钮。
2. Create 后组件变为 `Inputs ⌄`（可折叠），出现 `Execute automation`（主按钮）与 `Save without executing` 按钮及 `...` 菜单。
3. 点 `Select files` 打开 `File` 选择弹窗，四个 tab：`SELECT FROM CONNECTION` / `SELECT FROM DATA CATALOG` / `UPLOAD FILES` / `RETRIEVE DATA FROM CONNECTION`；选中文件 chip `Gen5_File.txt`（可移除）→ `Select`。
4. 点 `Execute automation` → toast `Analysis starting...` → `Analysis running...`（进度条）；组件内出现 run 记录链接 `Test File + Variable Run 2026-05-22 17:28:24`（hover 显示 Name + `ID ana_qv9V0P9x1F`），URL 形如 `…/analytics/analyses/ana_qv9V0P9x1F`。
5. 点击 run 链接打开分析页：标题 `Test File + Variable Run 2026-05-22 17:28:24`；左侧 `ANALYSIS DATA` 含 `Dataset` 与 `Variables dataset`；画布为已执行管线（全绿 ✓）：`File` → `Convert instrument files to ASM files` → `Convert CSV files to dataset` → `Hide columns`，另有独立 `Variables dataset` 节点。

**功能点**：Run 的输入来源四通道（Connection 选择 / Data Catalog 选择 / 本地上传 / 从 Connection 检索数据）；"执行"与"仅保存不执行"两种模式；run 与分析实例（ana_ ID）一一对应，可从 Entry 跳转查看流程图执行状态。

---

## 汇总：提取到的产品能力清单（按主题）

**数据源（source steps，10 种）**：Define template variables、Import files from data catalog、Create table from dataset / Insights block / Registry Schemas / uploaded CSV、Join tables、Union tables、From look up、Connect with external tool。

**下游步骤（17 种，5 大类）**：Custom code；Join/Union tables；Look up；Calculate interpolation；Transform 类 10 种（Add computed column、Add window functions、Aggregate table、Bin data、Convert column formats、Filter table、Find and replace text、Format columns、Hide columns、Pivot table）。

**Connect 转换（7 种）**：instrument→ASM、ASM→CSV、CSV→dataset、JSON→dataset、JSON→datasets+metadata、Extract/remove lines、Send to connection。

**Custom Code**：Python 沙箱 + 14 个白名单包（示例中另见 benchling-sdk）；IOData 契约（BytesIO/DataFrame/go.Figure）；五类输出端口（charts/datasets/files/stderr/stdout）；可选注入 `benchling: Benchling` SDK 客户端；执行时侧边预览输出。

**模板化**：Define template variables（类型/多选/min-max/必填/默认值）→ Variables dataset；analysis template 可与 Run schema 绑定自动执行；兼容规则：file inputs + static tables + variables，不支持 variable tables。

**Run schema / 执行**：输出文件 7 步配置（显示名、Benchling action 回写、表格展示与排序、transforms、列映射、delimiter、locale、dataset 命名 chip 模板）；dataset 列可从文件表头复制并可绑定 analysis template 做列映射；Edit as JSON；Duplicate/Export schema；执行时文件四来源 tab；Execute automation vs Save without executing；状态 toast（starting/running/sending data/completed）；结果自动插入 Notebook Entry（表格+图表）。

**通用 UX**：节点状态（✓/⚠/spinner）、连线数据类型图标、只读配置回看、ANALYSIS DATA 树 + New view、对象全局搜索选择器、Step descriptions 开关、Split workspace。
