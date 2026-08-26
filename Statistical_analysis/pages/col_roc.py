"""列分析 #7：ROC 曲线 —— 诊断准确性评估（AUC + 最优阈值）。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from sklearn.metrics import roc_curve, roc_auc_score

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "col-roc"
dash.register_page(__name__, path="/col/roc", title="ROC 曲线", name="ROC 曲线")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "n_case", "label": "病例数", "min": 15, "max": 150,
     "value": 60, "data_param": True},
    {"type": "slider", "id": "n_ctrl", "label": "对照数", "min": 15, "max": 150,
     "value": 60, "data_param": True},
    {"type": "slider", "id": "dprime", "label": "分离度 d′（均值差/SD）", "min": 0.2, "max": 3.0,
     "step": 0.1, "value": 1.5, "data_param": True},
    {"type": "group", "title": "阈值探索"},
    {"type": "slider", "id": "thr", "label": "交互阈值（滑动看灵敏度/特异度）",
     "min": -3, "max": 3, "step": 0.05, "value": 0.0},
    {"type": "checkbox", "id": "show_dist", "label": "显示病例/对照得分分布", "value": True},
    {"type": "checkbox", "id": "mark_youden", "label": "标记 Youden 最优阈值", "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(121)
    case = rng.normal(p["dprime"], 1, p["n_case"])
    ctrl = rng.normal(0, 1, p["n_ctrl"])
    return {"case": case.tolist(), "ctrl": ctrl.tolist()}


def _bootstrap_auc(scores, truth, B=2000, seed=0):
    rng = np.random.default_rng(seed)
    n1 = int(truth.sum()); n0 = len(truth) - n1
    idx_pos = np.where(truth == 1)[0]; idx_neg = np.where(truth == 0)[0]
    a = np.empty(B)
    for b in range(B):
        i = rng.choice(idx_pos, n1, replace=True)
        j = rng.choice(idx_neg, n0, replace=True)
        s = np.concatenate([scores[i], scores[j]])
        t = np.concatenate([np.ones(n1), np.zeros(n0)])
        # rank-based AUC
        rk = np.argsort(np.argsort(s))
        a[b] = (rk[t == 1].mean() - (n1 - 1) / 2) / n0
    return np.percentile(a, [2.5, 97.5])


def analyze(data, p):
    case = np.array(data["case"], dtype=float)
    ctrl = np.array(data["ctrl"], dtype=float)
    scores = np.concatenate([case, ctrl])
    truth = np.concatenate([np.ones(len(case)), np.zeros(len(ctrl))])

    fpr, tpr, thrs = roc_curve(truth, scores)
    auc = roc_auc_score(truth, scores)
    lo, hi = _bootstrap_auc(scores, truth)
    # Youden
    youden = np.argmax(tpr - fpr)
    thr_you = thrs[youden]
    sens_you, spec_you = tpr[youden], 1 - fpr[youden]
    # 当前阈值
    cur_sens = (scores[truth == 1] >= p["thr"]).mean()
    cur_spec = (scores[truth == 0] < p["thr"]).mean()

    n_axes = 2 if p["show_dist"] else 1
    fig = make_subplots(rows=n_axes, cols=1, row_heights=[0.6, 0.4] if n_axes > 1 else None,
                        vertical_spacing=0.12,
                        subplot_titles=("ROC 曲线", "得分分布") if n_axes > 1 else None)
    # ROC
    fig.add_trace(go.Scatter(x=fpr, y=tpr, mode="lines", name="ROC",
                             line=dict(color=PALETTE[1], width=3),
                             hovertemplate="FPR(1-特异度)=%{x:.2f}<br>TPR(灵敏度)=%{y:.2f}<extra></extra>"),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=[0, 1], y=[0, 1], mode="lines", name="随机 (AUC=0.5)",
                             line=dict(color="#bbbbbb", dash="dash", width=1.5),
                             showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=[fpr[youden]], y=[tpr[youden]], mode="markers",
                             marker=dict(color="#59A14F", size=13, symbol="star",
                                         line=dict(color="#fff", width=1)),
                             name="Youden 最优", showlegend=False,
                             hovertemplate=f"Youden 阈值 {thr_you:.2f}<extra></extra>"),
                  row=1, col=1)
    # 当前阈值点
    if p["thr"] <= max(thrs) and p["thr"] >= min(thrs):
        j = np.argmin(np.abs(thrs - p["thr"]))
        fig.add_trace(go.Scatter(x=[fpr[j]], y=[tpr[j]], mode="markers",
                                 marker=dict(color="#E15759", size=12, symbol="x",
                                             line=dict(width=2)),
                                 name="当前阈值", showlegend=False,
                                 hovertemplate=f"阈值 {p['thr']:.2f}<extra></extra>"),
                      row=1, col=1)
    if p["show_dist"]:
        nb = 24
        fig.add_trace(go.Histogram(x=ctrl, nbinsx=nb, name="对照",
                                   marker=dict(color="rgba(89,161,79,0.5)",
                                               line=dict(color="#59A14F", width=1)),
                                   histnorm="probability density"), row=2, col=1)
        fig.add_trace(go.Histogram(x=case, nbinsx=nb, name="病例",
                                   marker=dict(color="rgba(225,87,89,0.45)",
                                               line=dict(color="#E15759", width=1)),
                                   histnorm="probability density"), row=2, col=1)
        fig.add_vline(x=p["thr"], line_dash="dash", line_color="#111", line_width=2,
                      annotation_text=f"阈值 {p['thr']:.2f}", row=2, col=1)

    corner_note(fig, f"AUC = {auc:.4f} (95% CI {ci_text(lo, hi)})\n"
                      f"Youden 最优阈值 = {thr_you:.2f}\n"
                      f"当前阈值: 灵敏度 {cur_sens:.2f}  特异度 {cur_spec:.2f}", fs=12.5)
    fig.update_xaxes(title_text="1 - 特异度 (FPR)", row=1, col=1)
    fig.update_yaxes(title_text="灵敏度 (TPR)", row=1, col=1)
    if p["show_dist"]:
        fig.update_xaxes(title_text="生物标志物得分", row=2, col=1)
        fig.update_yaxes(title_text="密度", row=2, col=1)
    theme_fig(fig, height=600 if p["show_dist"] else 460)

    # AUC 与 Mann-Whitney 等价性
    U = (scores[truth == 1][:, None] > scores[truth == 0][None, :]).mean()
    rows = [
        ("AUC", fmt(auc)), ("AUC 95% CI (bootstrap)", ci_text(lo, hi)),
        ("AUC 与 Mann-Whitney U 等价", f"U/n₁n₀ = {U:.4f}"),
        ("Youden 最优阈值", fmt(thr_you)),
        ("最优灵敏度 / 特异度", f"{sens_you:.3f} / {spec_you:.3f}"),
        ("当前阈值", fmt(p["thr"])),
        ("当前灵敏度 / 特异度", f"{cur_sens:.3f} / {cur_spec:.3f}"),
        ("病例 / 对照", f"{len(case)} / {len(ctrl)}"),
    ]
    quality = ("优秀 (0.9~1)" if auc > 0.9 else "良好 (0.8~0.9)" if auc > 0.8 else
               "中等 (0.7~0.8)" if auc > 0.7 else "较差")
    stats = sh.stats_card([
        sh.section("ROC 分析结果", sh.kv_table(rows), first=True),
        sh.interp(f"AUC = {auc:.3f}，判别能力{quality}。Youden 最优阈值 {thr_you:.2f} 处"
                  f"灵敏度 {sens_you:.2f}、特异度 {spec_you:.2f}。"
                  f"AUC 数值上等价于 Mann-Whitney U 检验，AUC>0.5 即意味着两组得分分布有区分。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "ROC 曲线 · 诊断准确性",
    "评估生物标志物区分病例/对照的能力：扫描所有阈值计算 TPR/FPR 得 ROC 曲线，"
    "AUC + Bootstrap 95% CI，Youden 最优阈值，右侧滑杆实时探索任意阈值下的灵敏度/特异度。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
