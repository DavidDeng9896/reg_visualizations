"""列分析 #10：P 值堆栈 —— 高通量批量检验 + 多重比较校正 + 火山图。"""
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

PAGE_ID = "col-stackpvals"
dash.register_page(__name__, path="/col/stackpvals", title="P 值堆栈", name="P 值堆栈")

CONTROLS = [
    {"type": "group", "title": "数据生成（批量基因表达）"},
    {"type": "slider", "id": "n_genes", "label": "检验的基因数", "min": 20, "max": 200,
     "step": 10, "value": 100, "data_param": True},
    {"type": "slider", "id": "n", "label": "每组样本数", "min": 3, "max": 12,
     "value": 5, "data_param": True},
    {"type": "slider", "id": "prop_de", "label": "真实差异基因比例", "min": 0.0, "max": 0.5,
     "step": 0.02, "value": 0.15, "data_param": True},
    {"type": "slider", "id": "effect", "label": "差异幅度（效应量）", "min": 0.3, "max": 2.5,
     "step": 0.1, "value": 1.2, "data_param": True},
    {"type": "slider", "id": "sd", "label": "表达噪声 SD", "min": 0.5, "max": 3,
     "step": 0.1, "value": 1.0, "data_param": True},
    {"type": "group", "title": "检验与校正"},
    {"type": "radio", "id": "test", "label": "单基因检验方法",
     "options": [{"label": "t 检验", "value": "t"}, {"label": "Mann-Whitney", "value": "mw"}],
     "value": "t"},
    {"type": "select", "id": "correction", "label": "多重比较校正",
     "options": [{"label": "Benjamini-Hochberg (FDR)", "value": "fdr_bh"},
                 {"label": "Holm", "value": "holm"},
                 {"label": "Bonferroni", "value": "bonferroni"},
                 {"label": "不校正", "value": "none"}],
     "value": "fdr_bh"},
    {"type": "slider", "id": "fdr", "label": "显著阈值 α/FDR", "min": 0.01, "max": 0.2,
     "step": 0.005, "value": 0.05},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(151)
    g, n = p["n_genes"], p["n"]
    ctrl = rng.normal(0, p["sd"], (g, n))
    trt = rng.normal(0, p["sd"], (g, n))
    n_de = int(round(g * p["prop_de"]))
    de_idx = rng.choice(g, n_de, replace=False)
    trt[de_idx] += rng.choice([-1, 1], n_de)[:, None] * p["effect"] * p["sd"]
    return {"ctrl": ctrl.tolist(), "trt": trt.tolist(), "de_idx": sorted(de_idx.tolist())}


def analyze(data, p):
    ctrl = np.array(data["ctrl"], dtype=float)
    trt = np.array(data["trt"], dtype=float)
    g, n = ctrl.shape
    pvals = np.empty(g)
    lfc = trt.mean(axis=1) - ctrl.mean(axis=1)
    if p["test"] == "t":
        for i in range(g):
            pvals[i] = sps.ttest_ind(ctrl[i], trt[i], equal_var=False).pvalue
    else:
        for i in range(g):
            try:
                pvals[i] = sps.mannwhitneyu(ctrl[i], trt[i]).pvalue
            except ValueError:
                pvals[i] = 1.0
    if p["correction"] == "none":
        qvals = pvals
    else:
        _, qvals, _, _ = multipletests(pvals, alpha=p["fdr"], method=p["correction"])
    sig = qvals < p["fdr"]

    true_de = np.isin(np.arange(g), data["de_idx"])
    tp = np.sum(sig & true_de)
    fp = np.sum(sig & ~true_de)
    fn = np.sum(~sig & true_de)
    sens = tp / max(true_de.sum(), 1)
    prec = tp / max(tp + fp, 1)

    # 火山图
    logp = -np.log10(np.clip(pvals, 1e-15, None))
    fig = go.Figure()
    colors = np.where(sig & true_de, "#E15759",
                      np.where(sig & ~true_de, "#B07AA1",
                               np.where(true_de, "#F7C948", "#8a94a6")))
    fig.add_trace(go.Scatter(x=lfc, y=logp, mode="markers",
                             marker=dict(color=colors.tolist(), size=7, opacity=0.75,
                                         line=dict(color="rgba(0,0,0,0.15)", width=0.5)),
                             text=[f"基因{i + 1}" for i in range(g)],
                             hovertemplate="基因%{text}<br>log₂FC=%{x:.2f}<br>-log₁₀P=%{y:.2f}<extra></extra>",
                             name="火山图"))
    fig.add_hline(y=-np.log10(p["fdr"]), line_dash="dash", line_color="#555",
                  annotation_text=f"校正后阈值 α={p['fdr']}")
    if p["test"] == "t":
        fig.add_vline(x=0, line_color="#ccc", line_dash="dot")
    # 标记真实差异（示意）
    de_lfc = np.asarray(lfc)[true_de][:8].tolist() if true_de.any() else []
    de_logp = np.asarray(logp)[true_de][:8].tolist() if true_de.any() else []
    fig.add_trace(go.Scatter(x=de_lfc, y=de_logp,
                             mode="markers", marker=dict(color="#F7C948", size=6, symbol="circle-open"),
                             name="真实差异（示意）", showlegend=False, hoverinfo="skip"))
    corner_note(fig, f"显著: {int(sig.sum())} / {g}（校正后）\n"
                      f"灵敏度 {sens:.2f}  精确率 {prec:.2f}\n"
                      f"真实差异 {int(true_de.sum())} 个中检出 {int(tp)}", fs=12)
    fig.update_xaxes(title_text="log₂ 表达变化 (处理 − 对照)")
    fig.update_yaxes(title_text="-log₁₀ P")
    theme_fig(fig, height=480)

    rows = [
        ("检验基因数", str(g)),
        ("每组样本", f"n={n}"),
        ("单基因检验", "Welch t" if p["test"] == "t" else "Mann-Whitney"),
        ("多重比较校正", p["correction"]),
        ("原始 P<阈值 的基因数", str(int((pvals < p["fdr"]).sum()))),
        ("校正后显著的基因数", str(int(sig.sum()))),
        ("真实差异基因", f"{int(true_de.sum())} 个"),
        ("灵敏度（检出/真实差异）", f"{sens:.2f}"),
        ("精确率（显著中真阳性占比）", f"{prec:.2f}"),
    ]
    interp_txt = (f"在 {g} 个基因的批量检验中，{fmt_p(np.median(pvals))} 为 P 值中位数。"
                  f"应用 {p['correction']} 校正后 {int(sig.sum())} 个基因达到显著（FDR<{p['fdr']}）。"
                  f"不校正会大幅增加假阳性；Bonferroni 最保守，BH-FDR 是转录组默认。")
    stats = sh.stats_card([
        sh.section("批量检验摘要", sh.kv_table(rows), first=True),
        sh.section("最显著基因（Top 10）", sh.df_table(pd.DataFrame({
            "基因": [f"基因{i + 1}" for i in np.argsort(pvals)[:10]],
            "log₂FC": [f"{lfc[i]:+.3f}" for i in np.argsort(pvals)[:10]],
            "P 值": [f"{pvals[i]:.2e}" for i in np.argsort(pvals)[:10]],
            "校正 Q": [f"{qvals[i]:.2e}" for i in np.argsort(pvals)[:10]],
            "显著": ["是" if qvals[i] < p["fdr"] else "否" for i in np.argsort(pvals)[:10]],
        }))),
        sh.interp(interp_txt),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "P 值堆栈 · 高通量批量检验",
    "模拟转录组批量检验：对每个基因跑 t / Mann-Whitney 检验 → 收集 P 值 → "
    "BH / Holm / Bonferroni 校正 → 火山图可视化显著基因。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
