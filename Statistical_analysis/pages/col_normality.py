"""列分析 #5：正态性 / 对数正态性检验 + QQ 图。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p

PAGE_ID = "col-normality"
dash.register_page(__name__, path="/col/normality", title="正态性检验", name="正态性检验")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 8, "max": 200,
     "value": 40, "data_param": True},
    {"type": "select", "id": "dist", "label": "真实分布",
     "options": [{"label": "正态", "value": "normal"},
                 {"label": "对数正态（右偏）", "value": "lognorm"},
                 {"label": "指数（强右偏）", "value": "exp"},
                 {"label": "均匀", "value": "uniform"},
                 {"label": "双峰", "value": "bimodal"}],
     "value": "normal", "data_param": True},
    {"type": "group", "title": "检验选择"},
    {"type": "checkbox", "id": "shapiro", "label": "Shapiro-Wilk", "value": True},
    {"type": "checkbox", "id": "dagostino", "label": "D'Agostino-Pearson", "value": True},
    {"type": "checkbox", "id": "ks", "label": "Kolmogorov-Smirnov", "value": True},
    {"type": "checkbox", "id": "test_lognorm", "label": "同时检验对数正态性",
     "help": "对 log(Y) 再跑一次检验，判断数据是否对数正态。"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(101)
    n = p["n"]
    if p["dist"] == "normal":
        x = rng.normal(0, 1, n)
    elif p["dist"] == "lognorm":
        x = rng.lognormal(0, 0.6, n)
    elif p["dist"] == "exp":
        x = rng.exponential(1.0, n)
    elif p["dist"] == "uniform":
        x = rng.uniform(-1.7, 1.7, n)
    else:
        x = np.concatenate([rng.normal(-1.5, 0.5, n // 2), rng.normal(1.5, 0.5, n - n // 2)])
    return {"x": x.tolist()}


def _tests(x):
    out = []
    if len(x) >= 3:
        w, p = sps.shapiro(x)
        out.append(("Shapiro-Wilk", w, p))
    if len(x) >= 20:
        st, p = sps.normaltest(x)
        out.append(("D'Agostino-Pearson", st, p))
    st, p = sps.kstest(x, "norm", args=(x.mean(), x.std(ddof=1)))
    out.append(("Kolmogorov-Smirnov", st, p))
    return out


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    n = len(x)

    rows = []
    for name, stat, pv in _tests(x):
        show = {"Shapiro-Wilk": p["shapiro"], "D'Agostino-Pearson": p["dagostino"],
                "Kolmogorov-Smirnov": p["ks"]}[name]
        if show:
            rows.append((name, fmt(stat), fmt_p(pv), "正态" if pv > 0.05 else "拒绝正态"))
    if p["test_lognorm"]:
        with np.errstate(divide="ignore", invalid="ignore"):
            lx = np.log(x[x > 0])
        if len(lx) >= 3:
            w, pv = sps.shapiro(lx)
            rows.append(("对数正态 (log Shapiro)", fmt(w), fmt_p(pv),
                         "对数正态" if pv > 0.05 else "拒绝对数正态"))
    result_df = pd.DataFrame(rows, columns=["检验", "统计量", "P 值", "判定"])

    # QQ 图 + 直方图
    from plotly.subplots import make_subplots
    fig = make_subplots(rows=1, cols=2, subplot_titles=("QQ 图（理论分位数）", "直方图"),
                        column_widths=[0.5, 0.5])
    os_ = np.sort(x)
    theo = sps.norm.ppf((np.arange(1, n + 1) - 0.5) / n)
    fig.add_trace(go.Scatter(x=theo, y=os_, mode="markers", name="数据",
                             marker=dict(color=PALETTE[0], size=6),
                             hovertemplate="理论 %{x:.2f}<br>样本 %{y:.2f}<extra></extra>"), row=1, col=1)
    fig.add_trace(line_trace([theo.min(), theo.max()], [theo.min(), theo.max()],
                             name="正态参考线", color="#E15759", width=2, dash="dash"),
                  row=1, col=1)
    fig.add_trace(go.Histogram(x=x, nbinsx=max(8, int(np.sqrt(n) * 2)),
                               marker=dict(color="rgba(61,111,180,0.5)",
                                           line=dict(color="#3D6FB4")),
                               histnorm="probability density"), row=1, col=2)
    xs = np.linspace(x.min(), x.max(), 200)
    fig.add_trace(line_trace(xs, sps.norm.pdf(xs, x.mean(), x.std(ddof=1)),
                             name="正态拟合", color="#E15759", width=2.5), row=1, col=2)
    fig.update_xaxes(title_text="理论分位数", row=1, col=1)
    fig.update_yaxes(title_text="样本分位数", row=1, col=1)
    fig.update_xaxes(title_text="值", row=1, col=2)
    theme_fig(fig, height=440)

    # 判定汇总
    n_reject = sum(1 for r in rows if "拒绝" in r[3])
    verdict = ("基本服从正态分布" if n_reject == 0 else
               f"多数检验拒绝正态（{n_reject}/{len(rows)} 项）")
    stats = sh.stats_card([
        sh.section("正态性检验结果", sh.df_table(result_df), first=True),
        sh.interp(f"结论：{verdict}。小样本（n<20）时 Shapiro 功效较低，检验不拒绝也不能完全排除偏离正态。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "正态性检验 · 决定参数/非参数路线",
    "Shapiro-Wilk（小样本）、D'Agostino-Pearson、Kolmogorov-Smirnov 三种检验 + QQ 图，"
    "可切换多种数据分布观察检验行为，也可验证对数正态性。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
