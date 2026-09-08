"""列分析 #4：描述统计 —— 全量汇总 + 分布直方图。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "col-descriptive"
dash.register_page(__name__, path="/col/descriptive", title="描述统计", name="描述统计")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 10, "max": 300,
     "value": 80, "data_param": True},
    {"type": "select", "id": "shape", "label": "分布形状",
     "options": [{"label": "正态", "value": "normal"},
                 {"label": "右偏（log-正态）", "value": "lognorm"},
                 {"label": "双峰", "value": "bimodal"},
                 {"label": "均匀", "value": "uniform"}],
     "value": "normal", "data_param": True},
    {"type": "slider", "id": "sd", "label": "SD", "min": 1, "max": 12,
     "step": 0.5, "value": 3, "data_param": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(91)
    n = p["n"]
    if p["shape"] == "normal":
        x = rng.normal(10, p["sd"], n)
    elif p["shape"] == "lognorm":
        x = rng.lognormal(np.log(10), np.log(1 + p["sd"] / 10), n)
    elif p["shape"] == "bimodal":
        half = n // 2
        x = np.concatenate([rng.normal(6, p["sd"] * 0.5, half),
                            rng.normal(14, p["sd"] * 0.5, n - half)])
    else:
        x = rng.uniform(10 - p["sd"] * 1.7, 10 + p["sd"] * 1.7, n)
    return {"x": x.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    n = len(x)
    sem = x.std(ddof=1) / np.sqrt(n)
    stats = {
        "n": n, "均值": x.mean(), "中位数": np.median(x),
        "SD": x.std(ddof=1), "SEM": sem,
        "95% CI": (x.mean() - 1.96 * sem, x.mean() + 1.96 * sem),
        "Q1": np.percentile(x, 25), "Q3": np.percentile(x, 75),
        "IQR": np.percentile(x, 75) - np.percentile(x, 25),
        "最小值": x.min(), "最大值": x.max(),
        "偏度": float(sps.skew(x)), "峰度": float(sps.kurtosis(x)),
    }
    ci = stats["95% CI"]

    fig = go.Figure()
    fig.add_trace(go.Histogram(x=x, nbinsx=max(10, int(np.sqrt(n) * 2)),
                               name="频数", marker=dict(color="rgba(61,111,180,0.5)",
                                                       line=dict(color="#3D6FB4", width=1)),
                               yaxis="y"))
    fig.add_trace(go.Histogram(x=x, nbinsx=max(10, int(np.sqrt(n) * 2)),
                               name="密度", histnorm="probability density",
                               marker=dict(color="rgba(225,87,89,0.25)"), yaxis="y2", showlegend=False))
    # 均值 ± SD 标注
    fig.add_vline(x=stats["均值"], line_color="#111", line_width=2,
                  annotation_text=f"均值 {stats['均值']:.2f}")
    fig.add_vline(x=stats["均值"] - stats["SD"], line_color="#9aa", line_dash="dot")
    fig.add_vline(x=stats["均值"] + stats["SD"], line_color="#9aa", line_dash="dot",
                  annotation_text="±1 SD")
    fig.add_vline(x=ci[0], line_color="#E15759", line_dash="dash")
    fig.add_vline(x=ci[1], line_color="#E15759", line_dash="dash",
                  annotation_text="95% CI")
    fig.update_layout(barmode="overlay",
                      yaxis=dict(title="频数"),
                      yaxis2=dict(title="密度", overlaying="y", side="right",
                                  showgrid=False))
    theme_fig(fig, height=440)

    rows = [
        ("样本量 n", str(n)), ("均值", fmt(stats["均值"])),
        ("中位数", fmt(stats["中位数"])), ("SD", fmt(stats["SD"])),
        ("SEM", fmt(sem)), ("95% CI", f"[{ci[0]:.3g}, {ci[1]:.3g}]"),
        ("Q1 / Q3", f"{stats['Q1']:.3g} / {stats['Q3']:.3g}"),
        ("IQR", fmt(stats["IQR"])), ("最小 / 最大", f"{stats['最小值']:.3g} / {stats['最大值']:.3g}"),
        ("偏度", fmt(stats["偏度"])), ("峰度", fmt(stats["峰度"])),
    ]
    skew_note = ("右偏" if stats["偏度"] > 0.5 else "左偏" if stats["偏度"] < -0.5 else "近似对称")
    stats_card = sh.stats_card([
        sh.section("描述统计汇总", sh.kv_table(rows), first=True),
        sh.interp(f"分布呈{skew_note}（偏度 {stats['偏度']:.2f}）。"
                  f"均值 {stats['均值']:.2f}、中位数 {stats['中位数']:.2f}；"
                  f"{'均值与中位数接近，分布基本对称。' if abs(stats['偏度']) < 0.5 else '均值与中位数偏离，报告时建议同时给出两者。'}"),
    ])
    return fig, stats_card


layout = lambda: analysis_page(
    PAGE_ID, "描述统计 · 数据第一步",
    "计算 n / 均值 / 中位数 / SD / SEM / 95%CI / 分位数 / 偏度 / 峰度，"
    "并叠加频数与密度直方图，快速看数据全貌。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
