"""XY 分析 #4：样条 / LOWESS 平滑拟合（不预设模型形状）。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy.interpolate import UnivariateSpline
from statsmodels.nonparametric.smoothers_lowess import lowess

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "xy-spline"
dash.register_page(__name__, path="/xy/spline", title="样条 / LOWESS", name="样条 / LOWESS")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "select", "id": "data_shape", "label": "数据形状",
     "options": [{"label": "带噪声的正弦波", "value": "sin"},
                 {"label": "饱和增长曲线", "value": "saturate"},
                 {"label": "峰值（光谱样）", "value": "peak"}],
     "value": "sin", "data_param": True},
    {"type": "slider", "id": "n_points", "label": "数据点数", "min": 15, "max": 80,
     "value": 40, "data_param": True},
    {"type": "slider", "id": "noise", "label": "噪声 SD", "min": 0.02, "max": 0.6,
     "step": 0.02, "value": 0.12, "data_param": True},
    {"type": "group", "title": "样条（Spline）"},
    {"type": "slider", "id": "smooth", "label": "平滑度 s（越大越平滑）", "min": 0, "max": 50,
     "value": 3, "help": "样条平滑参数：s≈0 时插值穿点，s 越大曲线越光滑。"},
    {"type": "slider", "id": "k", "label": "样条阶数 k", "min": 1, "max": 5,
     "value": 3},
    {"type": "group", "title": "LOWESS"},
    {"type": "slider", "id": "frac", "label": "窗口比例 frac", "min": 0.05, "max": 0.6,
     "step": 0.01, "value": 0.25,
     "help": "每个点局部加权回归所用的数据比例，越大越平滑。"},
    {"type": "checkbox", "id": "show_lowess", "label": "显示 LOWESS 拟合", "value": True},
    {"type": "checkbox", "id": "show_spline", "label": "显示样条拟合", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def _shape(x, name):
    if name == "sin":
        return np.sin(x * 1.8) * 2 + 0.3 * x
    if name == "saturate":
        return 5 * (1 - np.exp(-0.35 * x))
    return 4 * np.exp(-0.5 * (x - 6) ** 2) + 0.4


def generate_data(p):
    rng = np.random.default_rng(7)
    if p["data_shape"] == "sin":
        x = np.linspace(0, 12, p["n_points"])
    elif p["data_shape"] == "saturate":
        x = np.linspace(0.5, 14, p["n_points"])
    else:
        x = np.linspace(0, 12, p["n_points"])
    y = _shape(x, p["data_shape"]) + rng.normal(0, p["noise"], len(x))
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    xx = np.linspace(x.min(), x.max(), 400)

    fig = go.Figure()
    fig.add_trace(scatter_trace(x, y, name="观测数据", color="#8a94a6", size=5,
                                hovertemplate="x=%{x:.3g}<br>y=%{y:.3g}<extra>数据</extra>"))

    spline_rmse = lowess_rmse = None
    if p["show_spline"]:
        try:
            spl = UnivariateSpline(x, y, k=int(p["k"]), s=float(p["smooth"]))
            ys = spl(xx)
            fig.add_trace(line_trace(xx, ys, name=f"样条 k={int(p['k'])} s={p['smooth']}",
                                     color=PALETTE[1], width=2.5))
            spline_rmse = float(np.sqrt(np.mean((y - spl(x)) ** 2)))
        except Exception as e:
            fig.add_annotation(text=f"样条失败: {e}", showarrow=False, xref="paper", yref="paper")
    if p["show_lowess"]:
        lo = lowess(y, x, frac=float(p["frac"]), it=3, return_sorted=True)
        fig.add_trace(line_trace(lo[:, 0], lo[:, 1],
                                 name=f"LOWESS frac={p['frac']:.2f}",
                                 color=PALETTE[2], width=2.5))
        lowess_rmse = float(np.sqrt(np.mean((y - np.interp(x, lo[:, 0], lo[:, 1])) ** 2)))

    note_lines = [f"n = {len(x)}"]
    if spline_rmse is not None:
        note_lines.append(f"样条 RMSE = {spline_rmse:.3g}")
    if lowess_rmse is not None:
        note_lines.append(f"LOWESS RMSE = {lowess_rmse:.3g}")
    corner_note(fig, "\n".join(note_lines), fs=12.5)
    fig.update_xaxes(title_text="X")
    fig.update_yaxes(title_text="Y")
    theme_fig(fig, height=480)

    rows = [
        ("数据点数", str(len(x))),
        ("数据形状", {"sin": "带噪正弦波", "saturate": "饱和增长", "peak": "光谱峰"}[p["data_shape"]]),
    ]
    if spline_rmse is not None:
        rows.append((f"样条 RMSE（k={int(p['k'])}, s={p['smooth']}）", fmt(spline_rmse)))
    if lowess_rmse is not None:
        rows.append((f"LOWESS RMSE（frac={p['frac']:.2f}）", fmt(lowess_rmse)))

    best = "—"
    if spline_rmse is not None and lowess_rmse is not None:
        best = "样条" if spline_rmse < lowess_rmse else "LOWESS"
    interp_txt = ("样条在控制平滑度后能贴合任意形状（无参数模型，适合探索性趋势）。"
                  f"当前设置下 {best} 的残差更小。" if best != "—" else
                  "调节右侧平滑参数观察曲线跟随数据的变化。")
    stats = sh.stats_card([
        sh.section("拟合摘要", sh.kv_table(rows), first=True),
        sh.interp(interp_txt),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "样条 / LOWESS · 无模型形状的平滑拟合",
    "不预设方程形式的平滑拟合：三次样条（可调阶数与平滑度）与 LOWESS 局部加权回归。"
    "适合探索性数据、趋势可视化与噪声数据的降噪。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
