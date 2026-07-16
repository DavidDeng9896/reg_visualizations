# Benchling 图片/GIF 视觉核对笔记

从 `analyze-data-with-benchling-analysis.md` 内嵌图片下载并拆帧后的要点记录（供功能点初稿追溯）。

## 已重点拆帧的 GIF

| 文件 | 用途 |
| --- | --- |
| Analysis_Left-Sidebar_Improvements.gif | 侧栏、Flowchart、Heatmap 实图、Regression 节点 I/O |
| Visual Flagging.gif | 回归套索打标、Flag/Clear、log 轴、多系列曲线、Tooltip |
| Advanced Visualizations.gif | Custom code + Plotly 多 Y 色谱图 |
| Screen Recording / Statistics.gif | Automation Designer 步骤菜单、插值等 |

## CONFIGURE 截图关键发现（相对纯正文）

- 存在 **Error bars** 列映射，散点图渲染竖直误差棒  
- **Color palette** 预设（如 Benchling (30)）在 CONFIGURE  
- 轴控件带 **Aa / #** 类型图标与 **settings 齿轮**  
- 底部为 **Save/Cancel**，并有 **+ FILTERS & TRANSFORMS**  
- **SPLIT WORKSPACE**

## Heatmap GIF 关键发现

- X=`Coordinates Column`，Y=`Coordinates Row`  
- 右侧连续色阶图例（Percent Inhibition 0–100）  
- Hover 显示行列坐标 + 数值  
- 节点输出含 Sampled output dataset  

## Regression GIF/截图关键发现

- SETUP：X/Y、Swap、Series、Color palette  
- REGRESSION：model（含 4PL）、Weights、Exclude flagged、Constraints  
- 打标点显示为 ×；套索选择；Tooltip 字段明细  
- SOURCE / MODEL OUTPUT / MODEL VARIABLES 底栏 Tab  
- 抽样提示条  

功能点勾选清单已回写至 `docs/archive/benchling-charts/`。
