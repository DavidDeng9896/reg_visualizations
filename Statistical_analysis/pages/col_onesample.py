"""列分析 #3：单样本检验 —— 与理论值比较（t / Wilcoxon）。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "col-onesample"
dash.register_page(__name__, path="/col/onesample", title="单样本检验", name="单样本检验")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 6, "max": 50,
     "value": 18, "data_param": True},
    {"type": "slider", "id": "mu_true", "label": "真实均值", "min": -10, "max": 40,
     "value": 12, "data_param": True},
    {"type": "slider", "id": "mu0", "label": "理论值 μ₀", "min": -10, "max": 40,
     "value": 10, "data_param": True},
    {"type": "slider", "id": "sd", "label": "SD", "min": 1, "max": 10,
     "step": 0.5, "value": 4, "data_param": True},
    {"type": "checkbox", "id": "skewed", "label": "生成偏态数据（演示非参数）",
     "data_param": True},
    {"type": "group", "title": "检验设置"},
    {"type": "radio", "id": "approach", "label": "方法",
     "options": [{"label": "自动（Shapiro 预检）", "value": "auto"},
                 {"label": "单样本 t 检验", "value": "t"},
                 {"label": "Wilcoxon 符号秩", "value": "w"}],
     "value": "auto"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(81)
    n = p["n"]
    if p["skewed"]:
        x = p["mu_true"] + rng.exponential(p["sd"], n) - p["sd"]
    else:
        x = rng.normal(p["mu_true"], p["sd"], n)
    return {"x": x.tolist(), "mu0": p["mu0"]}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    mu0 = data["mu0"]

    path = []
    use_t = p["approach"] != "w"
    if p["approach"] == "auto":
        w, spv = sps.shapiro(x)
        use_t = spv > 0.05
        path.append(f"Shapiro-Wilk: W={w:.3f}, {fmt_p(spv)} → " + ("正态→t检验" if use_t else "非正态→Wilcoxon"))

    if use_t:
        t, pv = sps.ttest_1samp(x, mu0)
        test_name = "单样本 t 检验"
        dof = len(x) - 1
        se = x.std(ddof=1) / np.sqrt(len(x))
        d = x.mean() - mu0
        ci = (d - 1.96 * se, d + 1.96 * se)
        stat_label = "t"
    else:
        t, pv = sps.wilcoxon(x - mu0)
        test_name = "Wilcoxon 符号秩检验"
        dof = None; ci = None
        d = x.mean() - mu0
        stat_label = "W"
    eff = d / x.std(ddof=1) if x.std(ddof=1) > 0 else 0

    fig = go.Figure()
    fig.add_trace(go.Histogram(x=x, nbinsx=max(8, int(np.sqrt(len(x)) * 2)), name="样本",
                               marker=dict(color="rgba(61,111,180,0.45)",
                                           line=dict(color="#3D6FB4", width=1)),
                               histnorm="probability density"))
    xs = np.linspace(x.min(), x.max(), 200)
    fig.add_trace(go.Scatter(x=xs, y=sps.norm.pdf(xs, x.mean(), x.std(ddof=1)),
                             mode="lines", name="正态拟合",
                             line=dict(color="#E15759", width=2.5),
                             hovertemplate="x=%{x:.2f}<br>密度 %{y:.3f}<extra></extra>"))
    fig.add_vline(x=mu0, line_dash="dash", line_color="#111", line_width=2,
                  annotation_text=f"理论值 μ₀={mu0:.2f}")
    fig.add_vline(x=x.mean(), line_color="#3D6FB4", line_width=1.5,
                  annotation_text=f"均值 {x.mean():.2f}")
    corner_note(fig, f"{test_name}\n{stat_label} = {t:.3f}\n{fmt_p(pv)}\nCohen's d = {eff:.2f}", fs=12.5)
    fig.update_xaxes(title_text="观测值")
    fig.update_yaxes(title_text="密度")
    theme_fig(fig, height=440)

    rows = [("检验方法", test_name), (f"统计量 {stat_label}", fmt(t))]
    if dof is not None:
        rows.append(("自由度", str(dof)))
    rows += [("P 值", fmt_p(pv)),
             ("均值", fmt(x.mean())),
             ("均值 - μ₀", fmt(d)),
             ("Cohen's d", fmt(eff))]
    if ci is not None:
        rows.append(("均值差 95% CI", ci_text(ci[0], ci[1])))

    stats = sh.stats_card([
        sh.section("决策路径", sh.interp(" → ".join(path) if path else "用户指定检验方法")),
        sh.section("检验结果", sh.kv_table(rows)),
        sh.interp(f"样本均值 {x.mean():.2f} 与理论值 {mu0:.2f} 的差异"
                  f"{'显著' if pv < 0.05 else '不显著'}（{fmt_p(pv)}）。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "单样本检验 · 与理论值比较",
    "把样本均值与已知标准值/历史基线比较：单样本 t 检验或 Wilcoxon 符号秩检验（偏态时）。"
    "图上同时画出理论值线与样本均值线。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
