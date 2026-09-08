"""XY 分析 #8：行统计 —— 每行（一个样本的技术重复）计算均值/SD/SEM/CV。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "xy-rowstats"
dash.register_page(__name__, path="/xy/rowstats", title="行统计", name="行统计")

CONTROLS = [
    {"type": "group", "title": "数据生成（复孔矩阵）"},
    {"type": "slider", "id": "n_rows", "label": "行数（样本数）", "min": 5, "max": 30,
     "value": 12, "data_param": True},
    {"type": "slider", "id": "n_reps", "label": "每行复孔数", "min": 2, "max": 8,
     "value": 3, "data_param": True},
    {"type": "slider", "id": "trend", "label": "行间递增趋势", "min": 0, "max": 3,
     "step": 0.2, "value": 0.8, "data_param": True},
    {"type": "slider", "id": "noise", "label": "复孔噪声 SD", "min": 0.1, "max": 3,
     "step": 0.1, "value": 0.8, "data_param": True},
    {"type": "group", "title": "显示"},
    {"type": "checkbox", "id": "show_points", "label": "显示复孔散点", "value": True},
    {"type": "radio", "id": "error_bar", "label": "误差条类型",
     "options": [{"label": "SD", "value": "sd"}, {"label": "SEM", "value": "sem"},
                 {"label": "95% CI", "value": "ci"}],
     "value": "sem"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(31)
    n, r = p["n_rows"], p["n_reps"]
    row_base = 5 + p["trend"] * np.arange(n) + rng.normal(0, 1.0, n)
    mat = row_base[:, None] + rng.normal(0, p["noise"], (n, r))
    return {"mat": mat.tolist()}


def analyze(data, p):
    mat = np.array(data["mat"], dtype=float)
    n, r = mat.shape
    df = pd.DataFrame(mat)
    stats_df = pd.DataFrame({
        "均值": df.mean(axis=1),
        "SD": df.std(axis=1, ddof=1),
        "SEM": df.std(axis=1, ddof=1) / np.sqrt(r),
        "95%CI": df.std(axis=1, ddof=1) / np.sqrt(r) * 1.96,
        "CV%": df.std(axis=1, ddof=1) / df.mean(axis=1).abs() * 100,
        "中位数": df.median(axis=1),
    })

    err = stats_df["SD"] if p["error_bar"] == "sd" else (
        stats_df["SEM"] if p["error_bar"] == "sem" else stats_df["95%CI"])
    fig = go.Figure()
    if p["show_points"]:
        for j in range(r):
            fig.add_trace(go.Scatter(
                x=np.arange(n) + (j - (r - 1) / 2) * 0.12, y=mat[:, j],
                mode="markers", marker=dict(size=5, color=PALETTE[j % len(PALETTE)],
                                            opacity=0.6, symbol="circle"),
                name=f"复孔{j + 1}", hovertemplate="行%{x:.0f}<br>%{y:.2f}<extra>复孔</extra>"))
    fig.add_trace(go.Scatter(
        x=np.arange(n), y=stats_df["均值"], mode="markers+lines", name="行均值",
        marker=dict(size=9, color="#1f1f1f", line=dict(width=1, color="#fff")),
        error_y=dict(type="data", array=err, visible=True, thickness=1.5,
                     width=4, color="#333"),
        hovertemplate="样本%{x:.0f}<br>均值 %{y:.2f} ± %{customdata:.2f}<extra></extra>",
        customdata=err))
    corner_note(fig, f"{n} 个样本 × {r} 个复孔\n误差条 = {p['error_bar'].upper()}", fs=12.5)
    fig.update_xaxes(title_text="样本（行）", dtick=1)
    fig.update_yaxes(title_text="测量值")
    theme_fig(fig, height=460)

    show_cols = ["均值", "SD", "SEM", "95%CI", "CV%", "中位数"]
    stats_card = sh.stats_card([
        sh.section(f"行统计汇总（每行 n={r} 个复孔）", sh.df_table(stats_df[show_cols]), first=True),
        sh.interp("行统计把每个样本的技术重复聚合成均值与变异指标：SEM = SD/√n，"
                  "95%CI = 1.96×SEM。CV 小于 15% 通常认为复孔一致性良好。"),
    ])
    return fig, stats_card


layout = lambda: analysis_page(
    PAGE_ID, "行统计 · 复孔聚合",
    "把每一行（一个样本的多个技术重复）聚合成均值/SD/SEM/95%CI/CV，并画出带误差条的行均值图。"
    "适用于复孔实验的批量汇总。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
