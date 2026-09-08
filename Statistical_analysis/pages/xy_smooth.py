"""XY 分析 #5：平滑 · 求导 · 积分（Savitzky-Golay / gradient / trapezoid）。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy.signal import savgol_filter
from scipy.integrate import cumulative_trapezoid, trapezoid

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "xy-smooth"
dash.register_page(__name__, path="/xy/smooth", title="平滑·求导·积分", name="平滑·求导·积分")

CONTROLS = [
    {"type": "group", "title": "数据生成（光谱/色谱样）"},
    {"type": "select", "id": "data_shape", "label": "数据形状",
     "options": [{"label": "双峰光谱", "value": "peaks"},
                 {"label": "衰减曲线", "value": "decay"},
                 {"label": "台阶信号", "value": "step"}],
     "value": "peaks", "data_param": True},
    {"type": "slider", "id": "n_points", "label": "采样点数", "min": 60, "max": 400,
     "value": 200, "data_param": True},
    {"type": "slider", "id": "noise", "label": "噪声 SD", "min": 0.02, "max": 0.5,
     "step": 0.01, "value": 0.08, "data_param": True},
    {"type": "group", "title": "Savitzky-Golay 平滑"},
    {"type": "slider", "id": "window", "label": "窗口长度（奇数）", "min": 5, "max": 61,
     "step": 2, "value": 21},
    {"type": "slider", "id": "polyorder", "label": "多项式阶数", "min": 2, "max": 5,
     "value": 3},
    {"type": "group", "title": "视图"},
    {"type": "checkbox", "id": "show_raw", "label": "显示原始数据", "value": True},
    {"type": "checkbox", "id": "show_deriv", "label": "一阶导数子图", "value": True},
    {"type": "checkbox", "id": "show_integral", "label": "累积积分子图", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def _signal(x, name):
    if name == "peaks":
        return (np.exp(-0.5 * ((x - 6) / 0.7) ** 2) + 1.4 * np.exp(-0.5 * ((x - 10.5) / 0.8) ** 2))
    if name == "decay":
        return np.exp(-0.4 * x) + 0.1
    return 0.8 * (x > 6) + 0.3 * (x > 9)


def generate_data(p):
    rng = np.random.default_rng(3)
    x = np.linspace(0, 14, p["n_points"])
    y = _signal(x, p["data_shape"]) + rng.normal(0, p["noise"], len(x))
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    w = int(p["window"])
    if w % 2 == 0:
        w += 1
    w = min(w, len(x) if len(x) % 2 == 1 else len(x) - 1)
    ys = savgol_filter(y, w, int(p["polyorder"]), mode="interp")

    rows_wanted = 1 + (1 if p["show_deriv"] else 0) + (1 if p["show_integral"] else 0)
    heights = [0.55] + [0.225] * (rows_wanted - 1)
    fig = make_subplots(rows=rows_wanted, cols=1, shared_xaxes=True,
                        row_heights=heights, vertical_spacing=0.06)

    if p["show_raw"]:
        fig.add_trace(scatter_trace(x, y, name="原始数据", color="#8a94a6", size=3,
                                    hovertemplate="x=%{x:.2f}<br>y=%{y:.3f}<extra>原始</extra>"),
                      row=1, col=1)
    fig.add_trace(line_trace(x, ys, name=f"S-G 平滑 w={w} p={p['polyorder']}",
                             color=PALETTE[1], width=2.5,
                             hovertemplate="x=%{x:.2f}<br>平滑=%{y:.3f}<extra></extra>"), row=1, col=1)
    fig.update_yaxes(title_text="信号强度", row=1, col=1)

    row_idx = 2
    if p["show_deriv"]:
        d = np.gradient(ys, x)
        fig.add_trace(line_trace(x, d, name="一阶导数", color=PALETTE[2], width=2), row=row_idx, col=1)
        fig.add_trace(go.Scatter(x=[x.min(), x.max()], y=[0, 0], mode="lines",
                                 line=dict(color="#999", dash="dash"), showlegend=False),
                      row=row_idx, col=1)
        fig.update_yaxes(title_text="dY/dX", row=row_idx, col=1)
        row_idx += 1
    if p["show_integral"]:
        integ = np.concatenate([[0], cumulative_trapezoid(ys, x)])
        fig.add_trace(line_trace(x, integ, name="累积积分", color=PALETTE[3], width=2), row=row_idx, col=1)
        fig.update_yaxes(title_text="∫Y dX", row=row_idx, col=1)

    fig.update_xaxes(title_text="X（波长/时间）", row=rows_wanted, col=1)
    total_auc = float(trapezoid(ys, x))
    noise_before = float(np.std(y - _signal(x, p["data_shape"])))
    noise_after = float(np.std(ys - _signal(x, p["data_shape"])))
    snr_gain = (noise_before / noise_after) if noise_after > 0 else float("inf")
    corner_note(fig, f"平滑窗口 w={w}  多项式 p={p['polyorder']}\n"
                      f"噪声 SD：{noise_before:.3g} → {noise_after:.3g}（信噪比提升 {snr_gain:.1f}×）",
                fs=12)
    theme_fig(fig, height=200 + 300 * rows_wanted)

    stats = sh.stats_card([
        sh.section("平滑效果", sh.kv_table([
            ("平滑方法", f"Savitzky-Golay（窗口 {w}，多项式 {int(p['polyorder'])} 阶）"),
            ("原始噪声 SD", fmt(noise_before)),
            ("平滑后噪声 SD", fmt(noise_after)),
            ("信噪比提升", f"{snr_gain:.1f}×"),
        ]), first=True),
        sh.section("积分结果", sh.kv_table([
            ("曲线下总面积 AUC", fmt(total_auc)),
            ("采样点数", str(len(x))),
        ])),
        sh.interp("Savitzky-Golay 平滑保持信号形状（峰位/宽度不变）同时压制噪声；"
                  "一阶导数定位峰边界/拐点，累积积分得到曲线下面积。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "平滑 · 求导 · 积分",
    "Savitzky-Golay 保形滤波平滑光谱/色谱信号，numpy.gradient 求一阶导数定位峰位拐点，"
    "梯形法累积积分。窗口与多项式阶数实时调节，观察信噪比提升。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
