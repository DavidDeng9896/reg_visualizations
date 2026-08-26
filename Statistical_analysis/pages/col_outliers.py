"""列分析 #9：离群点识别 —— IQR / Grubbs / ROUT(FDR)。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps
from statsmodels.stats.multitest import multipletests

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p

PAGE_ID = "col-outliers"
dash.register_page(__name__, path="/col/outliers", title="离群点识别", name="离群点识别")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "样本量", "min": 10, "max": 80,
     "value": 30, "data_param": True},
    {"type": "slider", "id": "n_out", "label": "注入离群点个数", "min": 0, "max": 6,
     "value": 2, "data_param": True},
    {"type": "slider", "id": "out_scale", "label": "离群点偏离程度（×SD）", "min": 2, "max": 8,
     "step": 0.5, "value": 4.0, "data_param": True},
    {"type": "group", "title": "方法"},
    {"type": "radio", "id": "method", "label": "检测方法",
     "options": [{"label": "IQR 法（1.5×IQR）", "value": "iqr"},
                 {"label": "Grubbs 检验", "value": "grubbs"},
                 {"label": "ROUT（FDR 控制）", "value": "rout"}],
     "value": "grubbs"},
    {"type": "slider", "id": "alpha", "label": "显著性水平 α / Q 值", "min": 0.01, "max": 0.2,
     "step": 0.005, "value": 0.05},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(141)
    x = rng.normal(10, 2, p["n"])
    n_out = p["n_out"]
    if n_out > 0:
        idx = rng.choice(len(x), n_out, replace=False)
        x[idx] = x[idx] + rng.choice([-1, 1], n_out) * p["out_scale"] * 2
    return {"x": x.tolist()}


def _grubbs(x, alpha):
    """迭代 Grubbs 检验。"""
    x = x.copy()
    n = len(x)
    out = np.zeros(n, dtype=bool)
    mask = np.ones(n, dtype=bool)
    for _ in range(n // 2):
        xx = x[mask]
        if len(xx) < 3:
            break
        m, s = xx.mean(), xx.std(ddof=1)
        if s == 0:
            break
        z = np.abs(xx - m) / s
        i = np.argmax(z)
        G = z[i]
        # Grubbs 临界值（双尾）
        tcrit = sps.t.ppf(1 - alpha / (2 * len(xx)), len(xx) - 2)
        gcrit = (len(xx) - 1) / np.sqrt(len(xx)) * np.sqrt(tcrit ** 2 / (len(xx) - 2 + tcrit ** 2))
        if G > gcrit:
            orig = np.where(mask)[0][i]
            out[orig] = True
            mask[orig] = False
        else:
            break
    return out


def _rout(x, Q):
    """简化版 ROUT：MAD 稳健化 + FDR 控制。"""
    med = np.median(x)
    mad = np.median(np.abs(x - med))
    sd = 1.4826 * mad
    if sd == 0:
        sd = x.std(ddof=1)
    if sd == 0:
        return np.zeros(len(x), dtype=bool)
    z = np.abs(x - med) / sd
    pvals = 2 * (1 - sps.t.cdf(z, len(x) - 1))
    pvals = np.clip(pvals, 1e-15, 1)
    _, qvals, _, _ = multipletests(pvals, alpha=Q, method="fdr_bh")
    return qvals < Q


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    n = len(x)
    method = p["method"]

    if method == "iqr":
        q1, q3 = np.percentile(x, [25, 75])
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        out = (x < lo) | (x > hi)
        desc = f"IQR 法：界限 Q1−1.5IQR={lo:.3g} ~ Q3+1.5IQR={hi:.3g}"
    elif method == "grubbs":
        out = _grubbs(x, p["alpha"])
        desc = f"Grubbs 检验（α={p['alpha']}，迭代剔除）"
    else:
        out = _rout(x, p["alpha"])
        desc = f"ROUT 简化版（MAD 稳健化 + BH-FDR，Q={p['alpha']}）"

    out_idx = np.where(out)[0]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=np.arange(n), y=x, mode="markers", name="数据",
                             marker=dict(color=PALETTE[0], size=9,
                                         line=dict(color="#fff", width=1)),
                             hovertemplate="样本%{x:.0f}<br>值 %{y:.2f}<extra></extra>"))
    fig.add_trace(go.Scatter(x=out_idx, y=x[out], mode="markers", name="离群点",
                             marker=dict(color="#E15759", size=13, symbol="x",
                                         line=dict(width=2)),
                             hovertemplate="样本%{x:.0f}<br>⚠ %{y:.2f}<extra>离群</extra>"))
    m, s = x.mean(), x.std(ddof=1)
    fig.add_hline(y=m, line_color="#59A14F", line_width=2, annotation_text=f"均值 {m:.2f}")
    fig.add_hline(y=m + 2 * s, line_color="#ccc", line_dash="dot")
    fig.add_hline(y=m - 2 * s, line_color="#ccc", line_dash="dot",
                  annotation_text="±2 SD")
    corner_note(fig, f"{desc}\n检测到 {len(out_idx)} 个离群点", fs=12)
    fig.update_xaxes(title_text="样本序号")
    fig.update_yaxes(title_text="测量值")
    theme_fig(fig, height=420)

    rows = [
        ("检测方法", desc),
        ("检测到离群点", f"{len(out_idx)} 个"),
        ("均值 ± SD", f"{m:.3g} ± {s:.3g}"),
    ]
    if len(out_idx):
        rows.append(("离群点序号", ", ".join(str(int(i)) for i in out_idx)))
        rows.append(("离群点值", ", ".join(f"{x[i]:.3g}" for i in out_idx)))

    interp_txt = f"{desc} 找到 {len(out_idx)} 个离群点。"
    if len(out_idx):
        interp_txt += " 离群点可能来自技术误差（复孔异常、加样失误），剔除前应核查原始记录；"
        interp_txt += "Grubbs/ROUT 属统计学证据，不能替代实验判断。"
    else:
        interp_txt += " 未发现统计离群点。"
    if p["method"] == "iqr":
        interp_txt += " IQR 法基于稳健四分位数，对分布形态要求低，但 1.5× 系数是经验值。"
    elif p["method"] == "rout":
        interp_txt += " ROUT 以 FDR 控制多重比较，是 Prism 的特色方法。"
    stats = sh.stats_card([
        sh.section("离群点识别结果", sh.kv_table(rows), first=True),
        sh.interp(interp_txt),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "离群点识别 · 数据清洗",
    "IQR 法 / Grubbs 检验 / ROUT（FDR 控制，Prism 特色）三种离群点检测方法，"
    "图上高亮标记离群点与 ±2SD 参考线。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
