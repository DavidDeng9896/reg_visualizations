"""XY 分析 #6：曲线下面积 AUC（梯形法则，可设基线）。"""
import dash
import numpy as np
import plotly.graph_objects as go
from scipy.integrate import trapezoid

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "xy-auc"
dash.register_page(__name__, path="/xy/auc", title="曲线下面积 AUC", name="曲线下面积 AUC")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "select", "id": "data_shape", "label": "曲线类型",
     "options": [{"label": "药代动力学衰减曲线", "value": "pk"},
                 {"label": "色谱峰", "value": "peak"},
                 {"label": "酶促产物累积", "value": "accum"}],
     "value": "pk", "data_param": True},
    {"type": "slider", "id": "n_points", "label": "数据点数", "min": 8, "max": 50,
     "value": 20, "data_param": True},
    {"type": "slider", "id": "noise", "label": "噪声 SD", "min": 0.0, "max": 0.4,
     "step": 0.01, "value": 0.05, "data_param": True},
    {"type": "group", "title": "AUC 设置（Prism 对话框）"},
    {"type": "select", "id": "baseline", "label": "基线扣除",
     "options": [{"label": "Y = 0", "value": "zero"},
                 {"label": "第一个点 Y 值", "value": "first"},
                 {"label": "末点 Y 值", "value": "last"}],
     "value": "zero"},
    {"type": "checkbox", "id": "fill", "label": "填充曲线下区域", "value": True},
    {"type": "checkbox", "id": "logx", "label": "X 轴取对数（药代 AUC）"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(11)
    if p["data_shape"] == "pk":
        t = np.linspace(0.1, 24, p["n_points"])
        c = 80 * np.exp(-0.18 * t) + 5
    elif p["data_shape"] == "peak":
        t = np.linspace(0, 20, p["n_points"])
        c = 10 * np.exp(-0.5 * ((t - 9) / 1.6) ** 2) + 0.5
    else:
        t = np.linspace(0, 30, p["n_points"])
        c = 0.6 * t / (2 + t)
    y = c + rng.normal(0, p["noise"] * max(c) * 0.5, len(t))
    y = np.clip(y, 0, None)
    return {"x": t.tolist(), "y": y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    xa = np.log10(x) if p["logx"] else x

    if p["baseline"] == "zero":
        base = 0.0
    elif p["baseline"] == "first":
        base = y[0]
    else:
        base = y[-1]
    yy = y - base

    total = float(trapezoid(yy, xa))
    x_plot = xa
    fig = go.Figure()
    fig.add_trace(scatter_trace(x_plot, y, name="数据点", color=PALETTE[0], size=5,
                                hovertemplate="%{x:.3g}<br>%{y:.3g}<extra></extra>"))
    fig.add_trace(line_trace(x_plot, y, name="连接曲线", color=PALETTE[1], width=2))
    if p["fill"]:
        fig.add_trace(go.Scatter(x=np.concatenate([x_plot, x_plot[::-1]]),
                                 y=np.concatenate([yy + base, np.full_like(yy, base)[::-1]]),
                                 fill="toself", fillcolor="rgba(61,111,180,0.22)",
                                 line=dict(width=0), name="AUC 区域", hoverinfo="skip"))
    fig.add_hline(y=base, line_dash="dot", line_color="#E15759",
                  annotation_text=f"基线 Y={base:.2g}")
    corner_note(fig, f"AUC = {total:.3g}" + (f"\n（X 对数化后）" if p["logx"] else ""), fs=14)
    fig.update_xaxes(title_text="log₁₀(时间)" if p["logx"] else "X")
    fig.update_yaxes(title_text="Y")
    theme_fig(fig, height=460)

    stats = sh.stats_card([
        sh.section("AUC 结果", sh.kv_table([
            ("曲线下面积 AUC", fmt(total)),
            ("基线扣除", {"zero": "Y = 0", "first": f"首点 Y = {y[0]:.3g}",
                          "last": f"末点 Y = {y[-1]:.3g}"}[p["baseline"]]),
            ("积分方法", "梯形法则 (trapezoid)"),
            ("数据点数", str(len(x))),
        ]), first=True),
        sh.interp("AUC 量化曲线下的总暴露量/总响应。梯形法则把相邻两点连成梯形求和，"
                  "是 Prism 计算 AUC 的标准方法。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "曲线下面积 AUC",
    "用梯形法则计算曲线下面积，支持基线扣除（Y=0 / 首点 / 末点）与 X 轴对数化。"
    "适用于药代动力学 AUC、色谱峰面积、总暴露量。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
