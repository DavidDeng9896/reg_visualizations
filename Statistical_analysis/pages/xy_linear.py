"""XY 分析 #2：简单线性回归 Y = a + bX。"""
import dash
import numpy as np
import pandas as pd
import statsmodels.api as sm
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, ci_band, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "xy-linear"
dash.register_page(__name__, path="/xy/linear", title="简单线性回归", name="简单线性回归")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n_points", "label": "样本量 n", "min": 6, "max": 60,
     "value": 20, "data_param": True},
    {"type": "slider", "id": "slope_true", "label": "真实斜率", "min": -3.0, "max": 3.0,
     "step": 0.1, "value": 1.2, "data_param": True},
    {"type": "slider", "id": "intercept_true", "label": "真实截距", "min": -5, "max": 8,
     "step": 0.5, "value": 2.0, "data_param": True},
    {"type": "slider", "id": "noise", "label": "噪声 SD", "min": 0.2, "max": 6.0,
     "step": 0.1, "value": 1.5, "data_param": True},
    {"type": "group", "title": "显示选项"},
    {"type": "checkbox", "id": "show_ci", "label": "95% 置信带（回归线）", "value": True},
    {"type": "checkbox", "id": "show_pi", "label": "95% 预测带（新观测）"},
    {"type": "checkbox", "id": "show_residuals", "label": "残差子图"},
    {"type": "checkbox", "id": "show_zero", "label": "强制过原点 (b=0)"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(42)
    x = np.linspace(0.5, 20, p["n_points"])
    if p["show_zero"]:
        y = p["slope_true"] * x + rng.normal(0, p["noise"], len(x))
    else:
        y = p["intercept_true"] + p["slope_true"] * x + rng.normal(0, p["noise"], len(x))
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    if p["show_zero"]:
        X = x[:, None]
    else:
        X = sm.add_constant(x)
    res = sm.OLS(y, X).fit()

    xx = np.linspace(x.min() - 1, x.max() + 1, 200)
    Xx = xx[:, None] if p["show_zero"] else sm.add_constant(xx)
    yfit = res.predict(Xx)

    n_axes = 2 if p["show_residuals"] else 1
    fig = make_subplots(rows=n_axes, cols=1, shared_xaxes=(n_axes > 1),
                        row_heights=[0.72, 0.28] if n_axes > 1 else None,
                        vertical_spacing=0.07)

    fig.add_trace(scatter_trace(
        x, y, name="观测值", color=PALETTE[0], size=7,
        hovertemplate="x=%{x:.3g}<br>y=%{y:.3g}<extra>观测</extra>"), row=1, col=1)
    fig.add_trace(line_trace(xx, yfit, name="回归线", color=PALETTE[1], width=3,
                             hovertemplate="x=%{x:.3g}<br>ŷ=%{y:.3g}<extra>拟合</extra>"), row=1, col=1)

    if (p["show_ci"] or p["show_pi"]) and not p["show_residuals"]:
        pred = res.get_prediction(Xx).summary_frame(alpha=0.05)
        if p["show_ci"]:
            ci_band(fig, xx, pred["mean_ci_lower"], pred["mean_ci_upper"], fillcolor="#E15759")
        if p["show_pi"]:
            ci_band(fig, xx, pred["obs_ci_lower"], pred["obs_ci_upper"],
                    fillcolor="#B07AA1", name="95% PI")

    if p["show_residuals"]:
        resid = y - res.predict(X)
        fig.add_trace(go.Scatter(x=x, y=resid, mode="markers", name="残差",
                                 marker=dict(color=PALETTE[2], size=6),
                                 hovertemplate="x=%{x:.3g}<br>残差=%{y:.3g}<extra></extra>"),
                      row=2, col=1)
        fig.add_trace(go.Scatter(x=[x.min(), x.max()], y=[0, 0], mode="lines",
                                 line=dict(color="#999", dash="dash"), showlegend=False),
                      row=2, col=1)

    slope = res.params.iloc[-1] if hasattr(res.params, "iloc") else res.params[-1]
    r2 = res.rsquared
    slo, shi = res.conf_int()[-1]
    corner_note(fig, f"y = {fmt(res.params[0] if not p['show_zero'] else 0)} + {fmt(slope)}x\n"
                      f"R² = {r2:.4f}   n = {len(x)}\nP(斜率) = {fmt_p(res.pvalues[-1])}",
                fs=12.5)
    fig.update_xaxes(title_text="X")
    fig.update_yaxes(title_text="Y")
    theme_fig(fig, height=560 if p["show_residuals"] else 480)

    coef_rows = [
        ("斜率 b", fmt(slope), fmt(res.bse[-1])),
        ("截距 a", fmt(res.params[0]), fmt(res.bse[0]) if not p["show_zero"] else "—"),
    ]
    coef_df = pd.DataFrame(coef_rows, columns=["项", "估计", "SE"])
    test_rows = [("斜率 95% CI", ci_text(slo, shi)),
                 ("t 值", fmt(res.tvalues[-1])),
                 ("P 值", fmt_p(res.pvalues[-1]))]
    if not p["show_zero"]:
        lo, hi = res.conf_int()[0]
        test_rows.insert(0, ("截距 95% CI", ci_text(lo, hi)))

    anova_rows = [("R²", fmt(res.rsquared)), ("调整 R²", fmt(res.rsquared_adj)),
                  ("F 统计量", fmt(res.fvalue)), ("F 检验 P", fmt_p(res.f_pvalue)),
                  ("残差 SD", fmt(np.sqrt(res.mse_resid))), ("样本量 n", str(len(x)))]

    interp = (f"线性回归显著（{fmt_p(res.pvalues[-1])}）：X 每增加 1 单位，Y 平均变化 {fmt(slope)} 个单位。"
              f"R² = {r2:.3f} 表示 X 能解释 {r2 * 100:.1f}% 的 Y 变异。")

    stats = sh.stats_card([
        sh.section("回归系数", sh.df_table(coef_df), first=True),
        sh.section("显著性检验", sh.kv_table(test_rows)),
        sh.section("模型拟合", sh.kv_table(anova_rows)),
        sh.interp(interp),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "简单线性回归 · Y = a + bX",
    "最小二乘拟合直线，检验斜率是否显著不为 0。适用于标准曲线初筛、趋势判断与校准。"
    "可显示 95% 置信带与预测带，或切换到残差子图诊断模型假设。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
