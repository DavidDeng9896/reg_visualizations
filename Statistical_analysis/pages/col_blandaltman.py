"""列分析 #8：Bland-Altman —— 两种测量方法一致性分析。"""
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

PAGE_ID = "col-blandaltman"
dash.register_page(__name__, path="/col/blandaltman", title="Bland-Altman", name="Bland-Altman")

CONTROLS = [
    {"type": "group", "title": "数据生成（方法 M1 vs M2）"},
    {"type": "slider", "id": "n", "label": "样本数", "min": 15, "max": 120,
     "value": 50, "data_param": True},
    {"type": "slider", "id": "bias", "label": "系统性偏倚（M2-M1 常数偏移）", "min": -6, "max": 6,
     "step": 0.2, "value": 1.2, "data_param": True},
    {"type": "slider", "id": "ratio", "label": "比例偏倚（M2 = M1×ratio）", "min": 0.8, "max": 1.2,
     "step": 0.005, "value": 1.05, "data_param": True},
    {"type": "slider", "id": "noise", "label": "随机误差 SD", "min": 0.3, "max": 4,
     "step": 0.1, "value": 1.5, "data_param": True},
    {"type": "group", "title": "显示"},
    {"type": "checkbox", "id": "show_loa_ci", "label": "一致性界限的 95% CI", "value": True},
    {"type": "checkbox", "id": "prop_reg", "label": "比例偏倚回归线", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(131)
    m1 = rng.uniform(5, 60, p["n"]) + rng.normal(0, 2, p["n"])
    m2 = p["bias"] + p["ratio"] * m1 + rng.normal(0, p["noise"], p["n"])
    return {"m1": m1.tolist(), "m2": m2.tolist()}


def analyze(data, p):
    m1 = np.array(data["m1"], dtype=float)
    m2 = np.array(data["m2"], dtype=float)
    d = m2 - m1
    mean = (m1 + m2) / 2
    bias = d.mean()
    s = d.std(ddof=1)
    loa_lo, loa_hi = bias - 1.96 * s, bias + 1.96 * s

    # 一致性界限的 CI（Altman 公式）
    n = len(d)
    se_loa = np.sqrt(3 * s ** 2 / n)
    tval = sps.t.ppf(0.975, n - 1)
    loa_lo_ci = (loa_lo - tval * se_loa, loa_lo + tval * se_loa)
    loa_hi_ci = (loa_hi - tval * se_loa, loa_hi + tval * se_loa)

    # 偏倚是否为 0 的 t 检验
    t_bias, p_bias = sps.ttest_1samp(d, 0)
    # 比例偏倚：d 对 mean 回归
    sl, ic, r, p_reg, se_sl = sps.linregress(mean, d)

    fig = go.Figure()
    fig.add_trace(scatter_trace(mean, d, name="差值", color=PALETTE[0], size=6,
                                hovertemplate="均值 %{x:.2f}<br>差值 %{y:.2f}<extra></extra>"))
    fig.add_trace(line_trace([mean.min() - 1, mean.max() + 1], [bias, bias],
                             name=f"偏倚 {bias:.2f}", color="#111", width=2))
    fig.add_trace(line_trace([mean.min() - 1, mean.max() + 1], [loa_hi, loa_hi],
                             name="+1.96 SD", color="#E15759", width=2, dash="dash"))
    fig.add_trace(line_trace([mean.min() - 1, mean.max() + 1], [loa_lo, loa_lo],
                             name="-1.96 SD", color="#E15759", width=2, dash="dash"))
    fig.add_trace(line_trace([mean.min() - 1, mean.max() + 1], [0, 0],
                             name="差值=0", color="#bbb", width=1.2, dash="dot"))
    if p["show_loa_ci"]:
        xr = [mean.min() - 1, mean.max() + 1]
        for y0 in (loa_lo, loa_hi):
            fig.add_trace(go.Scatter(x=xr + xr[::-1],
                                     y=[y0 + tval * se_loa] * 2 + [y0 - tval * se_loa] * 2,
                                     fill="toself", fillcolor="rgba(225,87,89,0.08)",
                                     line=dict(width=0), name="LoA CI", hoverinfo="skip",
                                     showlegend=False))
    if p["prop_reg"]:
        xr = np.linspace(mean.min(), mean.max(), 50)
        fig.add_trace(line_trace(xr, ic + sl * xr, name="比例偏倚回归",
                                 color="#59A14F", width=2.5, dash="dashdot"))
    corner_note(fig, f"偏倚 = {bias:.2f} (P = {p_bias:.3g})\n"
                      f"95% LoA: {loa_lo:.2f} ~ {loa_hi:.2f}\n"
                      f"比例偏倚回归 P = {p_reg:.3g}", fs=12.5)
    fig.update_xaxes(title_text="(M1 + M2) / 2")
    fig.update_yaxes(title_text="M2 − M1")
    theme_fig(fig, height=480)

    rows = [
        ("偏倚（均值差）", fmt(bias)),
        ("差值 SD", fmt(s)),
        ("一致性界限 ±1.96SD", f"{loa_lo:.3g} ~ {loa_hi:.3g}"),
        ("下限 95% CI", ci_text(loa_lo_ci[0], loa_lo_ci[1])),
        ("上限 95% CI", ci_text(loa_hi_ci[0], loa_hi_ci[1])),
        ("偏倚 = 0 检验", f"t={t_bias:.2f}, {fmt_p(p_bias)}"),
        ("比例偏倚回归斜率", fmt(sl)),
        ("比例偏倚回归 P", fmt_p(p_reg)),
        ("样本量", str(n)),
    ]
    verdict = ("存在显著系统性偏倚" if p_bias < 0.05 else "无显著系统性偏倚") + "；" + (
        "存在比例偏倚（差值随均值增大）" if p_reg < 0.05 else "无显著比例偏倚")
    stats = sh.stats_card([
        sh.section("Bland-Altman 一致性分析", sh.kv_table(rows), first=True),
        sh.interp(f"结论：{verdict}。一致性界限是否「临床可接受」需结合该指标的临床判断阈值来定，"
                  f"不能只看统计显著性。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "Bland-Altman · 方法一致性",
    "评估新仪器与金标准的一致性：均值-差值图 + 一致性界限 ±1.96SD（含 Altman 公式 CI），"
    "偏倚 t 检验与比例偏倚回归。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
