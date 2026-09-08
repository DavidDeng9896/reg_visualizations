"""XY 分析 #9：相关分析 —— Pearson / Spearman / Kendall。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "xy-correlation"
dash.register_page(__name__, path="/xy/correlation", title="相关分析", name="相关分析")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 10, "max": 200,
     "value": 60, "data_param": True},
    {"type": "slider", "id": "rho_true", "label": "真实相关系数 ρ", "min": -1.0, "max": 1.0,
     "step": 0.05, "value": 0.7, "data_param": True},
    {"type": "checkbox", "id": "monotone", "label": "生成单调非线性关系（测 Spearman）",
     "data_param": True, "help": "把 Y 做指数变换制造非线性但单调的相关，展示秩相关优势。"},
    {"type": "group", "title": "方法"},
    {"type": "radio", "id": "method", "label": "相关系数类型",
     "options": [{"label": "Pearson（线性）", "value": "pearson"},
                 {"label": "Spearman（秩）", "value": "spearman"},
                 {"label": "Kendall τ", "value": "kendall"}],
     "value": "pearson"},
    {"type": "checkbox", "id": "show_line", "label": "显示趋势线", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(41)
    rho = p["rho_true"]
    n = p["n"]
    z = rng.normal(0, 1, (2, n))
    cov = np.array([[1, rho], [rho, 1]])
    L = np.linalg.cholesky(cov)
    d = L @ z
    x = d[0]; y = d[1]
    if p["monotone"]:
        x = np.sort(x)
        y = np.exp(x * 0.9) + rng.normal(0, 0.15, n) * 2
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    m = p["method"]
    if m == "pearson":
        r, pv = sps.pearsonr(x, y)
        # Fisher z CI
        z = np.arctanh(np.clip(r, -0.99999, 0.99999))
        se = 1 / np.sqrt(len(x) - 3)
        lo, hi = np.tanh(z - 1.96 * se), np.tanh(z + 1.96 * se)
        label = "Pearson r"
    elif m == "spearman":
        r, pv = sps.spearmanr(x, y)
        # CI via Fisher on rho approx
        z = np.arctanh(np.clip(r, -0.99999, 0.99999))
        se = 1.029563 / np.sqrt(len(x) - 3)
        lo, hi = np.tanh(z - 1.96 * se), np.tanh(z + 1.96 * se)
        label = "Spearman ρ"
    else:
        tau, pv = sps.kendalltau(x, y)
        r, lo, hi = tau, None, None
        label = "Kendall τ"

    fig = go.Figure()
    fig.add_trace(scatter_trace(x, y, name="观测", color=PALETTE[0], size=6,
                                hovertemplate="X=%{x:.3g}<br>Y=%{y:.3g}<extra></extra>"))
    if p["show_line"] and m == "pearson":
        b, a = np.polyfit(x, y, 1)
        xx = np.linspace(x.min(), x.max(), 100)
        fig.add_trace(line_trace(xx, a + b * xx, name="趋势线", color=PALETTE[1], width=2.5))
    if p["show_line"] and m == "spearman":
        # 单调趋势（lowess）
        from statsmodels.nonparametric.smoothers_lowess import lowess
        lo = lowess(y, x, frac=0.4)
        fig.add_trace(line_trace(lo[:, 0], lo[:, 1], name="秩趋势 (LOWESS)",
                                 color=PALETTE[1], width=2.5))

    note = f"{label} = {r:.4f}\n{fmt_p(pv)}\nn = {len(x)}"
    if lo is not None:
        note += f"\n95% CI {ci_text(lo, hi)}"
    corner_note(fig, note, fs=13)
    fig.update_xaxes(title_text="X")
    fig.update_yaxes(title_text="Y")
    theme_fig(fig, height=480)

    rows = [(label, fmt(r)), ("P 值", fmt_p(pv)), ("样本量", str(len(x)))]
    if lo is not None:
        rows.insert(1, (f"{label} 95% CI", ci_text(lo, hi)))
    strength = "强" if abs(r) >= 0.7 else ("中等" if abs(r) >= 0.4 else "弱")
    stats = sh.stats_card([
        sh.section("相关分析结果", sh.kv_table(rows), first=True),
        sh.interp(f"{label} = {r:.3f}，呈{strength}程度{'正' if r > 0 else '负'}相关"
                  f"（{fmt_p(pv)}）。相关不代表因果。"
                  + ("由于数据是单调非线性，Spearman 秩相关通常更能反映真实关联。"
                     if p["monotone"] else "")),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "相关分析 · 两变量的共变关系",
    "量化两个指标的相关强度与方向：Pearson（线性/正态）、Spearman（秩，单调非线性）、"
    "Kendall τ。给出系数、P 值与 95% CI，并标注在图上。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
