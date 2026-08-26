"""首页：项目总览 + 20 个分析入口卡片。"""
import dash
from dash import html, dcc

dash.register_page(__name__, path="/", title="Prism Lab · 首页", name="首页")

DESC = {
    "xy_nonlinear": "拟合非线性模型（4PL 剂量-反应、Michaelis-Menten、指数衰减等），提取 EC50/Vmax/Kd 等参数，支持权重、稳健回归、约束与模型比较。",
    "xy_linear": "Y = a + bX 最小二乘回归，输出斜率/截距/显著性/R²，可选 95% 置信带与预测带。",
    "xy_logistic": "四参数/五参数 logistic 曲线拟合（Prism 的简单逻辑回归），用于 S 形剂量-反应与分类概率。",
    "xy_spline": "不预设模型形状的平滑拟合：三次样条（可调平滑度）与 LOWESS 局部加权回归对比。",
    "xy_smooth": "Savitzky-Golay 平滑、数值求导与梯形积分，适合光谱/色谱/速率数据。",
    "xy_auc": "曲线下面积 AUC：梯形法则积分，可设基线，适用于药代动力学与色谱峰面积。",
    "xy_deming": "X 与 Y 都有测量误差的 Model II 回归（正交距离最小化，需指定方差比 λ）。",
    "xy_rowstats": "按行计算均值/SD/SEM/CV（复孔数据的技术重复聚合），附误差条图。",
    "xy_correlation": "两变量相关性：Pearson / Spearman / Kendall，输出 r、P 值与 95% CI。",
    "xy_interpolate": "标准曲线反算未知样本浓度：4PL 拟合标准曲线后对未知 Y 反解 X。",
    "col_ttests": "两组均值比较：非配对/配对/单样本 × 参数/非参数，含 Welch 分支、效应量与决策路径。",
    "col_anova": "三组及以上比较：ANOVA + 事后检验（Tukey/Dunnett/Bonferroni），非参数走 Kruskal-Wallis + Dunn。",
    "col_onesample": "单样本与理论值比较：单样本 t 检验 / Wilcoxon 符号秩检验。",
    "col_descriptive": "描述统计：n/均值/中位数/SD/SEM/95%CI/分位数/偏度/峰度，附分布直方图。",
    "col_normality": "正态性/对数正态性检验：Shapiro-Wilk、D'Agostino、KS，附 QQ 图。",
    "col_frequency": "数据分布形态：直方图 + 频数表，可调组数/范围，观察偏态与双峰。",
    "col_roc": "诊断准确性：ROC 曲线 + AUC（DeLong CI）+ Youden 最优阈值，可交互调阈值。",
    "col_blandaltman": "两种测量方法一致性：均值-差值图 + 一致性界限 ±1.96SD（含 CI），比例偏倚检验。",
    "col_outliers": "异常值识别：IQR / Grubbs / ROUT(FDR) 三种方法，图上高亮离群点。",
    "col_stackpvals": "高通量批量检验：多基因 t 检验 + BH/Holm/Bonferroni 多重比较校正，火山图 + 显著表。",
}

XY = [
    ("xy_nonlinear", "非线性回归", "曲线拟合·参数提取"),
    ("xy_linear", "简单线性回归", "Y=a+bX"),
    ("xy_logistic", "简单逻辑回归", "4PL/5PL S 形"),
    ("xy_spline", "样条 / LOWESS", "平滑拟合"),
    ("xy_smooth", "平滑·求导·积分", "S-G 滤波"),
    ("xy_auc", "曲线下面积 AUC", "梯形积分"),
    ("xy_deming", "Deming 回归", "Model II"),
    ("xy_rowstats", "行统计", "复孔聚合"),
    ("xy_correlation", "相关分析", "r / P / CI"),
    ("xy_interpolate", "标准曲线插值", "反算浓度"),
]
COL = [
    ("col_ttests", "t 检验", "两组比较"),
    ("col_anova", "单因素 ANOVA", "多组+事后"),
    ("col_onesample", "单样本检验", "vs 理论值"),
    ("col_descriptive", "描述统计", "全量汇总"),
    ("col_normality", "正态性检验", "QQ + 检验"),
    ("col_frequency", "频数分布", "直方图"),
    ("col_roc", "ROC 曲线", "AUC + 阈值"),
    ("col_blandaltman", "Bland-Altman", "一致性"),
    ("col_outliers", "离群点识别", "IQR/Grubbs/ROUT"),
    ("col_stackpvals", "P 值堆栈", "多重校正"),
]


def _cards(items):
    cards = []
    for key, name, tag in items:
        cards.append(dcc.Link(
            html.Div([
                html.Div([html.Span(name, className="hc-title"),
                          html.Span(f" · {tag}", style={"color": "#9aa3b0", "fontSize": 12})]),
                html.Div(DESC[key], className="hc-desc"),
            ], className="home-card"),
            href=f"/{key.replace('_', '/')}",
        ))
    return cards


def layout():
    return html.Div([
        html.Div([
            html.H1("🧪 Prism Lab — AI 驱动统计分析交互实验室"),
            html.P("复刻 GraphPad Prism 的 20 项核心分析：左侧导航切换，右侧参数面板实时调节，"
                   "图表交互式呈现，统计结果与关键参数直接标注在图上。数据为合成数据（固定种子可复现），"
                   "所有分析由 scipy / lmfit / pingouin / statsmodels 真实计算。"),
        ], className="home-hero"),
        html.Div("XY 分析 · 研究两个连续变量的关系", className="home-cat"),
        html.Div(_cards(XY), className="home-grid"),
        html.Div("列分析 · 组间比较与分布", className="home-cat"),
        html.Div(_cards(COL), className="home-grid"),
    ])
