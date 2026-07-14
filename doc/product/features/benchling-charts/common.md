# Benchling 图表共性配置 · 功能点初稿（待确认）

> 参考原文 + **截图/GIF 拆帧核对**  
> 关键图依据：`configure-chart.png`、`change-view-type.png`、各 GIF 关键帧  
> 状态：初稿（已据视觉细节加厚），请勾选后再细化

---

## 0. 配置面板总结构（截图可见）

右侧编辑侧栏：

| UI 结构 | 说明 |
| --- | --- |
| **View type** 下拉 | 切换 Table / Bar / Line / Pie / Scatter / Heatmap … |
| Tab：**CONFIGURE** | 数据映射与色板、误差棒等 |
| Tab：**STYLE** | 外观（颜色逐系列、点样式、图例等） |
| 底部 | **Cancel** / **Save**（截图为 Save；正文亦称 Apply） |
| 底部入口 | **+ FILTERS & TRANSFORMS**（与作图同源侧栏） |
| 工作区 | **SPLIT WORKSPACE**（表/图或流程图分屏） |

列类型图标（表头与轴控件）：**Aa** = 文本/分类，**#** = 数值。

---

## 1. 数据 / 属性设置（CONFIGURE）

- [ ] **View Type 切换**（截图枚举：Table、Bar chart、Line chart、Pie chart、Scatter plot、Heatmap；正文另列 Box plot / Regression）
- [ ] **X-axis** 列映射 + 类型图标（Aa/#）
- [ ] **X-axis 字段设置齿轮**（截图有 settings 图标；具体子项待细化对照）
- [ ] **Y-axis** 列映射 + 类型图标（Aa/#）
- [ ] **Y-axis 字段设置齿轮**
- [ ] **X/Y 交换**（Regression SETUP 截图有 swap；标准图是否通用请确认）
- [ ] **Series** 列映射（`None` 或分类列 → 多系列着色）
- [ ] **Error bars** 列映射（截图：如 `Standard error of Calculated Concentration`；散点图可见竖直误差棒）
- [ ] **Color palette** 预设色板（截图：`Benchling (30)`）
- [ ] **Custom label（轴）**（正文 Configure；覆盖默认列名）
- [ ] **Save / Cancel** 提交或放弃配置

---

## 2. 布局 / 外观设置（STYLE）

> 正文：适用于各图类型，**regressions 除外**（除非另述）。

- [ ] **Color · 按系列取色**（色块 + color picker，覆盖默认色板）
- [ ] **Point · Shape**（标记形状）
- [ ] **Point · Opacity**（透明度滑杆）
- [ ] **Legend · Show/Hide**
- [ ] **Legend · Position**：Left / Right / Top / Bottom
- [ ] **Legend · Custom legend label**

---

## 3. 其他设置（GIF/截图可见）

- [ ] **从 Table 创建 / 切换为 Chart View**
- [ ] **Edit（铅笔）** 打开配置侧栏
- [ ] **Filters & Transforms** 改变作图输入数据
- [ ] **Hover Tooltip**（散点/热力/回归 GIF：显示轴字段与系列值）
- [ ] **SPLIT WORKSPACE** 分屏查看
- [ ] **大数据抽样提示**（回归截图：`Showing a random sample of 1000 rows out of N… Download to view complete data`）
- [ ] **SOURCE TABLE** 链回底层表（回归/图编辑态）
- [ ] Notebook / Outputs 嵌入与锁定（正文）

---

## 视觉核对备注

| 发现 | 来源 |
| --- | --- |
| CONFIGURE 含 **Error bars**、**Color palette**，不仅 X/Y/Series | configure-chart 截图 |
| Scatter 示例带 **竖直误差棒** | 同上 |
| View type 下拉可见 6 类（未见 Box，但正文有） | change-view-type 截图 |
| Heatmap：行列坐标轴 + 连续色阶图例 + 单元格 Hover | left-sidebar GIF 帧 |
| Regression：SETUP + REGRESSION 分区、Exclude flagged、套索打标 | visual-flagging / exclude-flagged |
| Flowchart 节点：Heatmap 输出 chart/dataset/sampled；Regression 输出 model chart/variables | left-sidebar GIF |
