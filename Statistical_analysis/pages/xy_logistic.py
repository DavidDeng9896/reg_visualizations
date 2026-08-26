"""XY 分析 #3：简单逻辑回归 —— S 形剂量-反应（4PL/5PL）+ 二分类概率视图。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from lmfit import Model

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "xy-logistic"
dash.register_page(__name__, path="/xy/logistic", title="简单逻辑回归", name="简单逻辑回归")


def _pl5(x, Bottom, Top, LogEC50, Hill, S):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill)) ** S


CONTROLS = [
    {"type": "group", "title": "数据生成（剂量-反应）"},
    {"type": "slider", "id": "n_points", "label": "浓度点数", "min": 6, "max": 14,
     "value": 9, "data_param": True},
    {"type": "slider", "id": "reps", "label": "每点复孔数", "min": 1, "max": 6,
     "value": 4, "data_param": True},
    {"type": "slider", "id": "bottom_true", "label": "Bottom（下平台）", "min": 0, "max": 30,
     "value": 10, "data_param": True},
    {"type": "slider", "id": "top_true", "label": "Top（上平台）", "min": 70, "max": 120,
     "value": 100, "data_param": True},
    {"type": "slider", "id": "logec50_true", "label": "LogEC50", "min": -1.5, "max": 1.5,
     "step": 0.05, "value": 0.0, "data_param": True},
    {"type": "slider", "id": "hill_true", "label": "Hill 斜率", "min": 0.3, "max": 3.0,
     "step": 0.05, "value": 1.0, "data_param": True},
    {"type": "slider", "id": "asym_true", "label": "非对称因子 S (5PL)", "min": 0.4, "max": 3.0,
     "step": 0.05, "value": 1.0, "data_param": True,
     "help": "数据生成时用 5PL 的 S 因子。S=1 即对称 4PL。"},
    {"type": "slider", "id": "noise", "label": "噪声 SD（占跨度比例）", "min": 0.01, "max": 0.2,
     "step": 0.005, "value": 0.03, "data_param": True},
    {"type": "group", "title": "模型选择"},
    {"type": "radio", "id": "fit_pl", "label": "拟合模型",
     "options": [{"label": "4PL（对称）", "value": 4}, {"label": "5PL（非对称）", "value": 5}],
     "value": 4},
    {"type": "group", "title": "视图"},
    {"type": "checkbox", "id": "show_class", "label": "同时显示二分类概率视图",
     "help": "把连续响应二值化（>50% 视为应答），叠加 logistic 概率曲线，展示 S 形分类概率。"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(2024)
    x = np.linspace(-2.0, 2.0, p["n_points"])
    ybar = _pl5(x, p["bottom_true"], p["top_true"], p["logec50_true"],
                p["hill_true"], p["asym_true"])
    sd = p["noise"] * (p["top_true"] - p["bottom_true"]) * 2
    y, x_all = [], []
    for xi, mu in zip(x, ybar):
        for _ in range(p["reps"]):
            y.append(rng.normal(mu, sd))
            x_all.append(xi)
    y = np.array(y)
    # 二分类（应答 = 活力 > 50%）
    resp = (y > 50).astype(int)
    return {"x": x_all, "y": y.tolist(), "resp": resp.tolist(),
            "x_unique": x.tolist(),
            "frac": [float(np.mean(resp[x_all == xi])) for xi in x]}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    resp = np.array(data["resp"], dtype=int)
    x_unique = np.array(data["x_unique"], dtype=float)

    model = Model(_pl5)
    pm = model.make_params()
    pm["Bottom"].set(value=y.min()); pm["Top"].set(value=y.max())
    pm["LogEC50"].set(value=np.median(x)); pm["Hill"].set(value=1.0)
    pm["S"].set(value=1.0)
    if p["fit_pl"] == 4:
        pm["S"].set(value=1.0, vary=False)
    result = model.fit(y, pm, x=x)

    xx = np.linspace(x.min() - 0.2, x.max() + 0.2, 300)
    yfit = result.eval(x=xx)

    n_axes = 2 if p["show_class"] else 1
    fig = make_subplots(rows=n_axes, cols=1, shared_xaxes=(n_axes > 1),
                        row_heights=[0.68, 0.32] if n_axes > 1 else None,
                        vertical_spacing=0.08,
                        subplot_titles=("剂量-反应曲线（% 活力）", "应答概率曲线（二分类）") if n_axes > 1 else None)
    fig.add_trace(scatter_trace(
        data["x_unique"], data["y_mean"] if "y_mean" in data else
        [float(np.mean(y[x == xi])) for xi in x_unique],
        error_y=[float(np.std(y[x == xi], ddof=1) / np.sqrt((x == xi).sum())) for xi in x_unique],
        name="均值 ± SEM", color=PALETTE[0],
        hovertemplate="log₁₀C=%{x:.2f}<br>活力 %{y:.1f}%<extra>复孔均值</extra>"), row=1, col=1)
    fig.add_trace(line_trace(xx, yfit, name="S 形拟合曲线", color=PALETTE[1], width=3,
                             hovertemplate="log₁₀C=%{x:.2f}<br>%{y:.1f}%<extra>拟合</extra>"), row=1, col=1)

    if p["show_class"]:
        # 二分类：每浓度应答率 + logistic 概率曲线（P = 1/(1+10^((LogEC50-x)*Hill))）
        p_logec = result.params["LogEC50"].value
        p_hill = result.params["Hill"].value
        p_frac = 1 / (1 + 10 ** ((p_logec - xx) * p_hill))
        fig.add_trace(go.Scatter(x=x_unique, y=data["frac"], mode="markers",
                                 marker=dict(color=PALETTE[2], size=11, symbol="diamond"),
                                 name="应答率", hovertemplate="log₁₀C=%{x:.2f}<br>应答率 %{y:.2f}<extra></extra>"),
                      row=2, col=1)
        fig.add_trace(line_trace(xx, p_frac, name="P(应答) logistic 曲线",
                                 color=PALETTE[2], width=2.5, dash="dash",
                                 hovertemplate="log₁₀C=%{x:.2f}<br>P=%{y:.2f}<extra>概率</extra>"), row=2, col=1)
        fig.add_hline(y=0.5, line_dash="dot", line_color="#999", row=2, col=1)

    logec = result.params["LogEC50"].value
    ic50 = 10 ** logec
    hill = result.params["Hill"].value
    if p["fit_pl"] == 5:
        s = result.params["S"].value
        note = f"5PL 拟合  S = {s:.3f}"
    else:
        note = "4PL 拟合（对称）"
    corner_note(fig, f"{note}\nIC₅₀ = {ic50:.3g}\nLogEC₅₀ = {logec:.3f}\n"
                      f"Hill = {hill:.3f}\nR² = {result.rsquared:.4f}", fs=12.5)
    fig.update_xaxes(title_text="log₁₀[浓度]")
    fig.update_yaxes(title_text="响应（% 最大）", row=1, col=1)
    if p["show_class"]:
        fig.update_yaxes(title_text="P(应答)", row=2, col=1)
    theme_fig(fig, height=640 if p["show_class"] else 480)

    lo, hi = result.params["LogEC50"].stderr, None
    stderr = result.params["LogEC50"].stderr
    ic_lo = 10 ** (logec - 1.96 * stderr) if stderr else None
    ic_hi = 10 ** (logec + 1.96 * stderr) if stderr else None

    param_rows = []
    for pn in result.var_names:
        par = result.params[pn]
        c_lo, c_hi = (par.value - 1.96 * par.stderr, par.value + 1.96 * par.stderr) if par.stderr else (None, None)
        param_rows.append((pn, fmt(par.value), fmt(par.stderr),
                           ci_text(c_lo, c_hi) if c_lo is not None else "—"))
    param_df = pd.DataFrame(param_rows, columns=["参数", "估计值", "SE", "95% CI"])

    # 二分类准确率（用拟合曲线预测）
    pred_frac = 1 / (1 + 10 ** ((logec - x) * hill))
    pred_class = (pred_frac > 0.5).astype(int)
    acc = float(np.mean(pred_class == resp))

    stats = sh.stats_card([
        sh.section("S 形曲线拟合（Prism「简单逻辑回归」）",
                   sh.kv_table([
                       ("拟合模型", f"{p['fit_pl']}PL（{'非对称' if p['fit_pl'] == 5 else '对称'}）"),
                       ("IC₅₀", fmt(ic50) + (f"（95% CI {fmt(ic_lo)} ~ {fmt(ic_hi)}）" if ic_lo else "")),
                       ("数据点 n", str(len(y))),
                       ("R²", fmt(result.rsquared)),
                   ]), first=True),
        sh.section("参数估计", sh.df_table(param_df)),
        sh.section("二分类视图", sh.kv_table([
            ("分类准确率", f"{acc * 100:.1f}%"),
            ("应答判定", "活力 > 50%"),
        ])),
        sh.interp(f"S 形曲线表明该化合物的 IC₅₀ = {ic50:.3g}（Hill 斜率 {hill:.2f}）。"
                  f"{'Hill 偏离 1 提示多位点结合或协同效应。' if abs(hill - 1) > 0.4 else 'Hill ≈ 1，符合单位点结合模型。'}"
                  f"{('二分类视角下模型以 %.1f%% 准确率区分应答/不应答。' % (acc * 100)) if p['show_class'] else ''}"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "简单逻辑回归 · S 形剂量-反应（4PL/5PL）",
    "拟合 S 形（logistic）剂量-反应曲线：4PL 对称或 5PL 非对称，提取 IC₅₀ 与 Hill 斜率。"
    "可选叠加二分类概率视图，把连续响应转换为应答概率曲线。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
