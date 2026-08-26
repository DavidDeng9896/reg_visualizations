"""XY 分析 #7：Deming（Model II）回归 —— X 和 Y 都有测量误差。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, ci_text

PAGE_ID = "xy-deming"
dash.register_page(__name__, path="/xy/deming", title="Deming 回归", name="Deming 回归")

CONTROLS = [
    {"type": "group", "title": "数据生成（双误差）"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 8, "max": 60,
     "value": 25, "data_param": True},
    {"type": "slider", "id": "slope_true", "label": "真实斜率", "min": 0.2, "max": 3.0,
     "step": 0.05, "value": 1.0, "data_param": True},
    {"type": "slider", "id": "intercept_true", "label": "真实截距", "min": -3, "max": 3,
     "step": 0.2, "value": 0.5, "data_param": True},
    {"type": "slider", "id": "sd_x", "label": "X 测量误差 SD", "min": 0.1, "max": 1.5,
     "step": 0.05, "value": 0.4, "data_param": True},
    {"type": "slider", "id": "sd_y", "label": "Y 测量误差 SD", "min": 0.1, "max": 1.5,
     "step": 0.05, "value": 0.4, "data_param": True},
    {"type": "group", "title": "Deming 设置"},
    {"type": "select", "id": "lambda_src", "label": "方差比 λ = σx²/σy² 来源",
     "options": [{"label": "用数据真实误差（λ = 数据已知）", "value": "true"},
                 {"label": "手动指定 λ", "value": "manual"}],
     "value": "true",
     "help": "Prism 要求指定 λ（X/Y 误差方差比）。用真实误差更贴近「已知仪器精度」的场景。"},
    {"type": "slider", "id": "lam_manual", "label": "手动 λ 值", "min": 0.05, "max": 5.0,
     "step": 0.05, "value": 1.0},
    {"type": "checkbox", "id": "show_ols", "label": "叠加 OLS 回归线做对比", "value": True},
    {"type": "checkbox", "id": "show_identity", "label": "显示 y=x 恒等线", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(21)
    x_true = np.linspace(1, 12, p["n"]) + rng.normal(0, 0.3, p["n"])
    y_true = p["intercept_true"] + p["slope_true"] * x_true
    x = x_true + rng.normal(0, p["sd_x"], p["n"])
    y = y_true + rng.normal(0, p["sd_y"], p["n"])
    return {"x": x.tolist(), "y": y.tolist(),
            "var_x": p["sd_x"] ** 2, "var_y": p["sd_y"] ** 2}


def _deming(x, y, lam):
    xm, ym = x.mean(), y.mean()
    sxx = np.sum((x - xm) ** 2); syy = np.sum((y - ym) ** 2)
    sxy = np.sum((x - xm) * (y - ym))
    if sxy == 0:
        return 1.0, ym - xm
    b = (syy - lam * sxx + np.sqrt((syy - lam * sxx) ** 2 + 4 * lam * sxy ** 2)) / (2 * sxy)
    a = ym - b * xm
    return a, b


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    if p["lambda_src"] == "true":
        lam = data["var_x"] / data["var_y"]
    else:
        lam = p["lam_manual"]

    a, b = _deming(x, y, lam)

    # jackknife SE（n 次留一重估）
    bs = np.array([_deming(np.delete(x, i), np.delete(y, i), lam)[1] for i in range(len(x))])
    se_b = float(np.sqrt((len(x) - 1) / len(x) * np.sum((bs - bs.mean()) ** 2)))
    b_lo, b_hi = b - 1.96 * se_b, b + 1.96 * se_b

    # OLS 对照
    ols = sps.linregress(x, y)
    xx = np.linspace(x.min() - 0.5, x.max() + 0.5, 200)

    fig = go.Figure()
    fig.add_trace(scatter_trace(x, y, name="观测 (X,Y 均有误差)", color=PALETTE[0], size=6,
                                hovertemplate="X=%{x:.3g}<br>Y=%{y:.3g}<extra></extra>"))
    fig.add_trace(line_trace(xx, a + b * xx, name="Deming 回归", color=PALETTE[1], width=3,
                             hovertemplate="%{x:.3g}<br>%{y:.3g}<extra>Deming</extra>"))
    if p["show_ols"]:
        fig.add_trace(line_trace(xx, ols.intercept + ols.slope * xx, name="OLS（仅 Y 误差）",
                                 color=PALETTE[3], width=2, dash="dash"))
    if p["show_identity"]:
        fig.add_trace(line_trace(xx, xx, name="y = x", color="#bbbbbb", width=1.5, dash="dot"))

    corner_note(fig, f"Deming:  y = {a:.3f} + {b:.3f}·x\n"
                      f"斜率 95% CI {ci_text(b_lo, b_hi)}\nλ = {lam:.3g}\n"
                      f"OLS 斜率 = {ols.slope:.3f}（仅 Y 误差）", fs=12)
    fig.update_xaxes(title_text="方法 A（含误差）")
    fig.update_yaxes(title_text="方法 B（含误差）")
    theme_fig(fig, height=480)

    stats = sh.stats_card([
        sh.section("Deming 回归（Model II）", sh.kv_table([
            ("截距 a", fmt(a)), ("斜率 b", fmt(b)),
            ("斜率 95% CI", ci_text(b_lo, b_hi)),
            ("方差比 λ", fmt(lam) + ("（来自数据真实误差）" if p["lambda_src"] == "true" else "（手动指定）")),
            ("样本量", str(len(x))),
        ]), first=True),
        sh.section("与 OLS 对比", sh.kv_table([
            ("OLS 斜率（只给 Y 加误差）", fmt(ols.slope)),
            ("斜率差异", fmt(b - ols.slope)),
            ("说明", "两仪器都有误差时应使用 Deming；只对 Y 加误差的 OLS 会低估斜率。"),
        ])),
        sh.interp("Deming 回归同时考虑 X 和 Y 的测量误差，最小化正交方向的加权距离。"
                  "方法学比较（新仪器 vs 金标准）时审稿人通常要求给出 λ 的取值依据。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "Deming 回归 · Model II（X、Y 均有误差）",
    "当 X 与 Y 都有测量误差时（方法学比较、双仪器校准），用正交距离加权最小化拟合，"
    "需指定方差比 λ = σx²/σy²。与 OLS 对比可见斜率差异。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
