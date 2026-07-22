# Benchling Automation Designer 功能清单（待选型细化）

> 依据：
> - docs/reference/automation-designer-data-analysis.md（[原文](https://help.benchling.com/hc/en-us/articles/46077729600909-Automate-Data-Analysis-with-Automation-Designer)）
> - docs/reference/automation-designer-custom-code.md（[原文](https://help.benchling.com/hc/en-us/articles/45805331624717-Custom-Code-in-Automation-Designer)）
> - docs/reference/raw/image-analysis.md（22 个图片/GIF 附件的逐一视觉解析）
>
> 整理时间：2026-07-22

---

## A. 流程图画布与通用交互（Flowchart Canvas UX）

- 无限点阵画布：缩放控件（- % +）、适配、全屏、Split workspace
- 顶部工具栏：面包屑、`...` 更多、`Flowchart`、`Send output`、`+ Add data` 主按钮
- 节点卡片：步骤名 + 类型图标；状态机（绿 ✓ 已配置 / 黄 ⚠ "Waiting on step input or configuration" / 执行中 spinner）
- 节点显式分 Inputs / Outputs 端口，拖线连接；连线中点图标指示数据类型（回形针=文件，表格=dataset）
- 拖出连线即触发右侧 "Add step" 面板；节点可重命名
- 右侧抽屉式配置面板（Cancel/Next/Save，可展开全屏）；保存后点击节点为**只读**配置回看
- 左侧 ANALYSIS DATA 树：源 → 处理 → 产物（dataset/chart/文件），`+ New view` 打开表格/图表/文件预览
- 源步骤面板支持搜索与 "Step descriptions" 开关；对象选择器为全局搜索
- 左下角常驻 `Connect with external tool`

## B. 数据源步骤（Source steps，6 大类 10 种）

- Define template variables（见 E）
- Create file → Import files from data catalog（可设 base file name，即节点名）
- Create table × 4：
  - from dataset（快照式，不随后续 dataset 变更刷新）
  - from Insights block（Dashboard → Block 两级级联；静态快照）
  - from Registry Schemas（4 步向导：选 schema+Filters → 选列 → Add Results → 命名）
  - from uploaded CSV（拖拽/文件选择上传）
- Combine existing tables → Join tables / Union tables
- Look up from existing table → From look up
- External data → Connect with external tool

## C. Connect 仪器数据转换管线（7 种转换步骤）

- Convert instrument files to ASM files（原始仪器文件 → Allotrope ASM JSON，选厂商/连接器）
- Convert ASM files to CSV files（transform 类型：Well / Sample / Measurement / Datacube / Group，受连接器支持范围限制）
- Convert CSV files to dataset（Dataset name、CSV delimiter/自定义分隔符、Data locale、Excel sheet 名；**单文件 ≤30MB**，超限走 Custom Code）
- Convert JSON file to dataset（Column Name 支持 `$var$` 替换、JSON path、Include/Required 开关）
- Convert JSON file to datasets and JSON metadata files（额外支持 Include in output、Output as metadata、JOIN/PIVOT transforms）
- Extract or remove lines from files（去头/尾行等预处理）
- Send to connection（结果回传仪器连接，如下发指令文件）

## D. 下游分析步骤（5 大类 17 种）

- Code → Custom code（见 F）
- Combine tables → Join tables / Union tables
- Create table → Look up（按某列值 + 标识符格式 Id 向 entity/plate schema 回填元数据，数据富化）
- Statistics → Calculate interpolation
- Transform × 10：Add computed column、Add window functions、Aggregate table、Bin data、Convert column formats、Filter table、Find and replace text、Format columns、Hide columns、Pivot table
- Charts：从左侧栏添加图表可视化
- Outputs：定义哪些 chart/result/dataset 在模板运行时发送到 Notebook entry

## E. 模板变量与参数化（Define template variables）

- 变量类型：Boolean、Text、Integer、Decimal、Benchling Type（AA/DNA/RNA sequence、Container、Custom Entity、Mixture、Molecule、Plate、User）
- 配置项：Multi-select 开关、min/max 约束、Required、默认值（示例值，模板应用时被替换）
- 一个变量节点产出 "Variables dataset"；`+ Add variable` 可定义多个
- 注意：变量类型与自动生成的 run schema 字段类型**非 1:1 映射**（如多选文本 → 单选文本），保存模板后需核对

## F. Custom Code（Python 自定义代码）

- 入口契约：`def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]`；`IOData(name, data)`，data ∈ {BytesIO, pd.DataFrame, plotly go.Figure}
- 多输入按连线顺序到达（可按 index 或 name 引用），支持 dataset 与 file 混合输入
- 五类输出端口：Output charts / Output datasets / Output files / Standard error / Standard output
- 代码编辑器：行号、语法高亮、折叠，预置模板代码与 imports；执行时侧边数据预览
- 错误显示：节点上直接给出行号 + 异常信息
- 预装包（两篇文档版本略有差异，合计）：allotropy、biopython、lmfit、matplotlib、numpy、pandas、plotly、pyarrow、pydantic、scikit-learn、scipy、seaborn、statsmodels、openpyxl、flowkit、kaleido、pycorn、rdkit；**不能 pip 安装**
- GIF 示例中函数签名可注入 `benchling: Benchling | None` SDK 客户端（与"不支持 SDK"的限制说明矛盾，见"观察与出入"）
- 典型用法（文档各配一个 GIF 示例）：解析仪器文件、统计计算（t 检验/ANOVA/Z' 因子）、高级可视化（多 y 轴色谱图 + find_peaks）、生成输出文件（BytesIO + 文件名）
- 最佳实践：序列操作用 biopython；4PL/5PL 拟合用 lmfit；decimal.Decimal 须先转 float 再进 numpy
- 示例库：github.com/benchling/app-examples-python → examples/custom-code-AD
- 模板中的 Custom Code 被锁定不可编辑；脚本随模板保存/迁移；无版本控制（历史从 audit log 下载）
- 限制：单次执行 ≤15 分钟；无网络访问；输出建议固定数量（允许空输出）

## G. Analysis Template（模板化与复用）

- 从 Analysis 通过 `...` → Save as Analysis Template 保存；选 Template Collection（使用者需 Read 权限）
- Starting Tables 行为：Static（每次相同，参考数据）/ Variable（每次运行供新数据）
- 保存时配置 Outputs：chart / result / dataset → 指定 Notebook entry 的目标 section
- **模板创建后不可编辑**；变更需另存新模板
- 支持跨 tenant 配置迁移（Custom Code 脚本随模板迁移；变量输入文件与连接数据源不迁移，需重连）

## H. Run schema 绑定与执行（两条路径）

### H1. Variable input tables 路径
- Settings → Run Schemas：Record dataset → Configure Dataset（可从文件表头复制列，列名/类型/Required）
- 绑定 Analysis Template（选择器预过滤"单 variable input"模板）+ Template column ↔ Dataset column 逐列映射
- 输出文件 7 步配置：显示名 → Benchling action（Register entities / Transfer samples / Record results / Record dataset / Plate transfer）→ 表格展示与排序 → transforms → 列映射 → delimiter → data locale → dataset 命名 chip 模板（Run schema name + date + time）
- Notebook 执行：插入 run → Retrieve Data（Connect 拉取或手动上传）→ Preview Files → Process Data → 结果自动插入 entry
- Record results + Record dataset 同时开启时，dataset 由 results 自动生成、不可改
- 此路径下额外的 file/static 输入按 static 处理

### H2. Input files / Static tables / Variables 路径
- Run schema 直接选 Analysis template（tooltip：兼容 file inputs、static tables、variables；**不支持 variable tables**）
- 自动生成 Analysis template fields 表（system name / Required / Multi-select / Definition），可配默认数据源过滤
- Notebook 执行：模板变量显示为配置项 → Create → 选文件（**最多 24 个**，四来源：Select From Connection / Data Catalog / Upload Files / Retrieve From Connection 如 Chromeleon、AVEVA PI、Empower）→ **Execute automation**（或 Save without executing）
- run 与分析实例一一对应（ana_ ID），可跳转查看执行流程图

### H 通用
- 状态 toast 序列：starting → running → sending data → inserting content → completed（可 Open）
- 结果（表格 + 图表）自动回写 Notebook entry；分析与 dataset 存于 entry 同文件夹
- entry 编辑锁可能阻塞写入，可从进度条重试
- Schema 支持 Duplicate / Export / Edit as JSON

---

## 观察与出入（深入细化时值得核实）

1. **SDK 矛盾**：文档限制条款写 "Benchling SDK and API are not supported"，但 Advanced Visualizations 的 GIF 示例代码明确出现 `from benchling_sdk.benchling import Benchling` 与 `benchling: Benchling | None = None` 注入参数，且其 Supported packages 注释含 benchling-sdk。
2. **预装包清单版本差异**：两篇文档的 package 表不完全一致（数据分析篇 14 个、Custom Code 篇 18 个，多了 flowkit/kaleido/pycorn/rdkit，numpy/pydantic 版本号也不同）——可能文档更新时间不同，租户实际版本以文档给的探测代码为准。
3. 文档截图录制时间为 2025-02 至 2026-05，UI 可能已有更新。
