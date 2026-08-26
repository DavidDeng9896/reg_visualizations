"""列分析 #1：t 检验 —— 两组均值比较（含决策路径：正态性预检 → 参数/非参数）。"""
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

PAGE_ID = "col-ttests"
dash.register_page(__name__, path="/col/ttests", title="t 检验", name="t 检验")

CONTROLS = [
    {"type": "group", "title": "实验设计（Prism Experimental design）"},
    {"type": "radio", "id": "design", "label": "设计类型",
     "options": [{"label": "非配对（两组独立）", "value": "unpaired"},
                 {"label": "配对（同一对象两次测量）", "value": "paired"},
                 {"label": "单样本（与理论值比）", "value": "onesample"}],
     "value": "unpaired"},
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n", "label": "每组样本量", "min": 5, "max": 40,
     "value": 12, "data_param": True},
    {"type": "slider", "id": "mu_ctrl", "label": "对照组均值", "min": 0, "max": 40,
     "value": 20, "data_param": True},
    {"type": "slider", "id": "mu_trt", "label": "处理组均值", "min": 0, "max": 40,
     "value": 28, "data_param": True},
    {"type": "slider", "id": "sd", "label": "组内 SD", "min": 1, "max": 12,
     "step": 0.5, "value": 5, "data_param": True},
    {"type": "slider", "id": "paired_corr", "label": "配对相关性 (0~1)", "min": 0, "max": 0.95,
     "step": 0.05, "value": 0.6, "data_param": True,
     "help": "配对设计下同一对象两次测量的相关强度，越大配对越有效。"},
    {"type": "group", "title": "Assume Gaussian?"},
    {"type": "radio", "id": "gauss", "label": "正态性假设",
     "options": [{"label": "自动（先做 Shapiro 预检）", "value": "auto"},
                 {"label": "是（参数检验）", "value": "yes"},
                 {"label": "否（非参数检验）", "value": "no"}],
     "value": "auto"},
    {"type": "group", "title": "Calculations"},
    {"type": "radio", "id": "equal_var", "label": "非配对方差假设",
     "options": [{"label": "Welch（不等方差，推荐）", "value": "welch"},
                 {"label": "假设等方差（Student）", "value": "equal"}],
     "value": "welch"},
    {"type": "radio", "id": "tail", "label": "检验方向",
     "options": [{"label": "双尾", "value": 2}, {"label": "单尾（处理>对照）", "value": 1}],
     "value": 2},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(61)
    n = p["n"]
    if p["design"] == "onesample":
        vals = rng.normal(p["mu_trt"], p["sd"], n)
        return {"data": vals.tolist(), "design": "onesample", "mu0": p["mu_ctrl"]}
    if p["design"] == "unpaired":
        a = rng.normal(p["mu_ctrl"], p["sd"], n)
        b = rng.normal(p["mu_trt"], p["sd"], n)
        return {"a": a.tolist(), "b": b.tolist(), "design": "unpaired"}
    # paired
    base = rng.normal(0, 1, n)
    a = p["mu_ctrl"] + p["sd"] * base
    b = p["mu_trt"] + p["sd"] * (p["paired_corr"] * base + np.sqrt(1 - p["paired_corr"] ** 2) * rng.normal(0, 1, n))
    return {"a": a.tolist(), "b": b.tolist(), "design": "paired"}


def analyze(data, p):
    design = data["design"]
    path = []  # 决策路径记录
    if design == "onesample":
        x = np.array(data["data"], dtype=float)
        mu0 = data["mu0"]
    else:
        a = np.array(data["a"], dtype=float)
        b = np.array(data["b"], dtype=float)

    # ---- 正态性预检 ----
    use_parametric = p["gauss"] != "no"
    if p["gauss"] == "auto":
        if design == "onesample":
            w, sp = sps.shapiro(x)
            path.append(f"Shapiro-Wilk: W={w:.3f}, {fmt_p(sp)} → " + ("正态" if sp > 0.05 else "非正态"))
            use_parametric = sp > 0.05
        elif design == "paired":
            d = b - a
            w, sp = sps.shapiro(d)
            path.append(f"差值 Shapiro-Wilk: W={w:.3f}, {fmt_p(sp)} → " + ("正态" if sp > 0.05 else "非正态"))
            use_parametric = sp > 0.05
        else:
            w1, p1 = sps.shapiro(a); w2, p2 = sps.shapiro(b)
            ok = p1 > 0.05 and p2 > 0.05
            path.append(f"两组 Shapiro: P1={p1:.3f}, P2={p2:.3f} → " + ("均可视为正态" if ok else "有组非正态"))
            use_parametric = ok
    elif p["gauss"] == "yes":
        path.append("用户指定：假设正态 → 参数检验")
    else:
        path.append("用户指定：不假设正态 → 非参数检验")

    # ---- 执行检验 ----
    if design == "unpaired":
        if use_parametric:
            if p["equal_var"] == "welch":
                stat, pv = sps.ttest_ind(a, b, equal_var=False)
                test_name = "Welch's t 检验"
            else:
                stat, pv = sps.ttest_ind(a, b, equal_var=True)
                test_name = "Student t 检验（等方差）"
            dof = (len(a) + len(b) - 2) if p["equal_var"] == "equal" else None
            d = b.mean() - a.mean()
            se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
            ci = (d - 1.96 * se, d + 1.96 * se)
        else:
            stat, pv = sps.mannwhitneyu(a, b, alternative="two-sided")
            test_name = "Mann-Whitney U"
            dof = None; d = b.mean() - a.mean(); ci = None
        eff = (b.mean() - a.mean()) / np.sqrt(((a.std(ddof=1) ** 2 + b.std(ddof=1) ** 2) / 2))
    elif design == "paired":
        d = b - a
        if use_parametric:
            stat, pv = sps.ttest_rel(a, b)
            test_name = "配对 t 检验"
            dof = len(a) - 1
            se = d.std(ddof=1) / np.sqrt(len(d))
            d_eff = d.mean()
            ci = (d_eff - 1.96 * se, d_eff + 1.96 * se)
        else:
            stat, pv = sps.wilcoxon(a, b)
            test_name = "Wilcoxon 符号秩检验"
            dof = None; ci = None
            d_eff = d.mean()
        eff = d.mean() / d.std(ddof=1) if d.std(ddof=1) > 0 else 0
    else:
        if use_parametric:
            stat, pv = sps.ttest_1samp(x, mu0)
            test_name = "单样本 t 检验"
            dof = len(x) - 1
            se = x.std(ddof=1) / np.sqrt(len(x))
            d_eff = x.mean() - mu0
            ci = (d_eff - 1.96 * se, d_eff + 1.96 * se)
        else:
            stat, pv = sps.wilcoxon(x - mu0)
            test_name = "Wilcoxon 符号秩检验"
            dof = None; ci = None
            d_eff = x.mean() - mu0
        eff = d_eff / x.std(ddof=1) if x.std(ddof=1) > 0 else 0

    if p["tail"] == 1:
        pv = pv / 2

    # ---- 绘图 ----
    fig = go.Figure()
    if design == "unpaired":
        rng = np.random.default_rng(0)
        for i, (arr, name, col) in enumerate([(a, "对照组", PALETTE[0]), (b, "处理组", PALETTE[1])]):
            j = rng.uniform(-0.15, 0.15, len(arr))
            fig.add_trace(go.Scatter(x=i + 1 + j, y=arr, mode="markers", name=name,
                                     marker=dict(color=col, size=7, opacity=0.75),
                                     hovertemplate=f"{name}: %{{y:.2f}}<extra></extra>"))
            m, s = arr.mean(), arr.std(ddof=1)
            fig.add_trace(go.Scatter(x=[i + 1], y=[m], mode="markers",
                                     marker=dict(color="#1f1f1f", size=13, symbol="diamond"),
                                     showlegend=False,
                                     error_y=dict(type="data", array=[s], visible=True, thickness=2),
                                     hovertemplate=f"{name} 均值 {m:.2f} ± SD {s:.2f}<extra></extra>"))
        fig.update_xaxes(tickvals=[1, 2], ticktext=["对照组", "处理组"])
    elif design == "paired":
        for ai, bi in zip(a, b):
            fig.add_trace(go.Scatter(x=[1, 2], y=[ai, bi], mode="lines+markers",
                                     line=dict(color="#cccccc", width=1), showlegend=False,
                                     marker=dict(size=4, color="#9aa"), hoverinfo="skip"))
        for i, (arr, name, col) in enumerate([(a, "前", PALETTE[0]), (b, "后", PALETTE[1])]):
            fig.add_trace(go.Scatter(x=[i + 1], y=arr, mode="markers", name=name,
                                     marker=dict(color=col, size=10, opacity=0.8),
                                     hovertemplate=f"{name}: %{{y:.2f}}<extra></extra>"))
        md = (b - a).mean()
        fig.add_trace(go.Scatter(x=[1, 2], y=[a.mean(), b.mean()], mode="lines+markers",
                                 line=dict(color="#1f1f1f", width=3), showlegend=False,
                                 marker=dict(color="#1f1f1f", size=12, symbol="diamond"),
                                 name="均值连线"))
        fig.update_xaxes(tickvals=[1, 2], ticktext=["对照", "处理"])
    else:
        fig.add_trace(go.Histogram(x=x, nbinsx=int(np.sqrt(len(x)) * 2), name="数据",
                                   marker=dict(color="rgba(61,111,180,0.5)", line=dict(color="#3D6FB4")),
                                   histnorm="probability density"))
        fig.add_vline(x=mu0, line_dash="dash", line_color="#E15759",
                      annotation_text=f"理论值 μ₀={mu0:.2f}")
        fig.update_xaxes(title_text="观测值")

    pv_str = fmt_p(pv)
    note = [f"{test_name}", f"统计量 = {stat:.3g}", f"{fmt_p(pv)}", f"Cohen's d = {eff:.2f}"]
    if design == "onesample":
        note.append(f"均值差 = {d_eff:.2f}")
    elif design == "unpaired":
        note.append(f"均值差 = {d:.2f}")
    else:
        note.append(f"差值均值 = {d_eff:.2f}")
    corner_note(fig, "\n".join(note), fs=12.5)
    fig.update_yaxes(title_text="观测值")
    theme_fig(fig, height=460)

    # ---- 统计卡 ----
    rows = [("检验方法", test_name), ("统计量", fmt(stat))]
    if dof is not None:
        rows.append(("自由度 df", str(dof)))
    rows += [("P 值", pv_str),
             ("Cohen's d", fmt(eff)),
             ("方向", "双尾" if p["tail"] == 2 else "单尾")]
    if design == "unpaired":
        rows.append(("均值差", fmt(d)))
    elif design == "paired":
        rows.append(("配对差值均值", fmt(d_eff)))
    else:
        rows.append(("均值 - μ₀", fmt(d_eff)))
    if ci is not None:
        rows.append(("均值差 95% CI", ci_text(ci[0], ci[1])))

    verdict = "显著（P < 0.05），拒绝原假设" if pv < 0.05 else "不显著（P ≥ 0.05），无法拒绝原假设"
    stats = sh.stats_card([
        sh.section("决策路径", sh.interp(" → ".join(path))),
        sh.section("检验结果", sh.kv_table(rows)),
        sh.interp(f"{verdict}。效应量 Cohen's d = {eff:.2f}"
                  + ("（小）" if abs(eff) < 0.2 else ("（中）" if abs(eff) < 0.5 else "（大）"))),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "t 检验 · 两组均值比较",
    "非配对/配对/单样本三种设计 × 参数/非参数两条路径。自动模式下先做 Shapiro 正态性预检，"
    "再决定用 t 检验还是 Mann-Whitney / Wilcoxon —— 复刻 Prism 的决策向导。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
