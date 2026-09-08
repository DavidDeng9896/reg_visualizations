"""列分析 #6：频数分布 —— 直方图 + 频数表 + 累积分布。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "col-frequency"
dash.register_page(__name__, path="/col/frequency", title="频数分布", name="频数分布")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 20, "max": 500,
     "value": 120, "data_param": True},
    {"type": "select", "id": "shape", "label": "分布形状",
     "options": [{"label": "正态", "value": "normal"},
                 {"label": "双峰（两群聚集）", "value": "bimodal"},
                 {"label": "右偏", "value": "skew"}],
     "value": "normal", "data_param": True},
    {"type": "group", "title": "分箱设置"},
    {"type": "radio", "id": "bin_method", "label": "分箱方法",
     "options": [{"label": "自动（√n）", "value": "sqrt"},
                 {"label": "Rice", "value": "rice"},
                 {"label": "手动箱数", "value": "manual"}],
     "value": "sqrt"},
    {"type": "slider", "id": "n_bins", "label": "手动箱数", "min": 5, "max": 40,
     "value": 15},
    {"type": "checkbox", "id": "show_cum", "label": "叠加累积百分比曲线", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(111)
    n = p["n"]
    if p["shape"] == "normal":
        x = rng.normal(10, 2.5, n)
    elif p["shape"] == "bimodal":
        x = np.concatenate([rng.normal(7, 1.2, n // 2), rng.normal(13, 1.2, n - n // 2)])
    else:
        x = rng.exponential(3.0, n) + 2
    return {"x": x.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    n = len(x)
    if p["bin_method"] == "manual":
        nb = int(p["n_bins"])
    elif p["bin_method"] == "rice":
        nb = int(np.ceil(2 * n ** (1 / 3)))
    else:
        nb = int(np.sqrt(n))
    nb = max(4, min(nb, 60))

    counts, edges = np.histogram(x, bins=nb)
    density = counts / counts.sum() * 100
    cum = np.cumsum(counts) / counts.sum() * 100
    mid = (edges[:-1] + edges[1:]) / 2

    fig = make_subplots(rows=1, cols=2, column_widths=[0.55, 0.45],
                        subplot_titles=("频数分布", "累积分布"))
    fig.add_trace(go.Bar(x=mid, y=counts, name="频数", marker_color="rgba(61,111,180,0.55)",
                         marker_line=dict(color="#3D6FB4", width=1),
                         hovertemplate="区间中点 %{x:.2f}<br>频数 %{y}<extra></extra>"), row=1, col=1)
    fig.add_trace(go.Scatter(x=mid, y=density, mode="markers+lines", name="频率%",
                             marker=dict(color="#E15759", size=5),
                             line=dict(color="#E15759", width=1.5), yaxis="y2",
                             hovertemplate="区间 %{x:.2f}<br>占比 %{y:.2f}%<extra></extra>"))
    fig.update_layout(yaxis2=dict(title="占比 %", overlaying="y", side="right", showgrid=False))
    if p["show_cum"]:
        fig.add_trace(line_trace(edges, np.concatenate([[0], cum]), name="累积%",
                                 color="#59A14F", width=2.5,
                                 hovertemplate="≤ %{x:.2f}<br>累积 %{y:.1f}%<extra></extra>"), row=1, col=2)
    fig.update_xaxes(title_text="值", row=1, col=1)
    fig.update_xaxes(title_text="值（上界）", row=1, col=2)
    fig.update_yaxes(title_text="频数", row=1, col=1)
    theme_fig(fig, height=440)

    # 频数表
    rows = []
    for i in range(nb):
        rows.append((f"[{edges[i]:.3g}, {edges[i + 1]:.3g})", int(counts[i]),
                     f"{density[i]:.1f}%", f"{cum[i]:.1f}%"))
    freq_df = pd.DataFrame(rows, columns=["区间", "频数", "占比", "累积%"])

    # 峰态提示
    if p["shape"] == "bimodal":
        shape_note = "分布呈双峰，提示数据来自两个不同群体。"
    else:
        shape_note = "分布单峰，可观察偏态与聚集情况。"
    stats = sh.stats_card([
        sh.section(f"频数表（{nb} 箱）", sh.df_table(freq_df), first=True),
        sh.interp(f"{shape_note} 频数分布是看数据形态（偏态、双峰、异常聚集）的第一步。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "频数分布 · 数据形态",
    "直方图 + 频数表 + 累积分布曲线，分箱方法可调（√n / Rice / 手动），观察偏态、双峰与异常聚集。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
