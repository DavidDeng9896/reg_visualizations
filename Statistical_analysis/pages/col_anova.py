"""列分析 #2：单因素 ANOVA —— 多组比较 + 事后检验（含参数/非参数路径）。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from scipy import stats as sps
import statsmodels.api as sm
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.multitest import multipletests
import scikit_posthocs as sp
from pingouin import welch_anova

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p

PAGE_ID = "col-anova"
dash.register_page(__name__, path="/col/anova", title="单因素 ANOVA", name="单因素 ANOVA")

CONTROLS = [
    {"type": "group", "title": "数据生成"},
    {"type": "slider", "id": "k", "label": "组数", "min": 3, "max": 6,
     "value": 4, "data_param": True},
    {"type": "slider", "id": "n", "label": "每组样本量", "min": 4, "max": 20,
     "value": 8, "data_param": True},
    {"type": "slider", "id": "effect", "label": "组间效应（均值差）", "min": 0, "max": 12,
     "step": 0.5, "value": 4, "data_param": True},
    {"type": "slider", "id": "sd", "label": "组内 SD", "min": 1, "max": 10,
     "step": 0.5, "value": 4, "data_param": True},
    {"type": "checkbox", "id": "hetero", "label": "方差不等（组内 SD 递增）",
     "data_param": True, "help": "让各组 SD 随均值增大，触发 Levene 预检并改用 Welch ANOVA。"},
    {"type": "group", "title": "假设与路径"},
    {"type": "radio", "id": "approach", "label": "方法路径",
     "options": [{"label": "自动（预检后决定）", "value": "auto"},
                 {"label": "参数（ANOVA + 事后）", "value": "param"},
                 {"label": "非参数（Kruskal-Wallis + Dunn）", "value": "nonparam"}],
     "value": "auto"},
    {"type": "group", "title": "事后检验"},
    {"type": "radio", "id": "posthoc", "label": "事后方法",
     "options": [{"label": "Tukey（所有两两比较）", "value": "tukey"},
                 {"label": "Dunnett（vs 对照组）", "value": "dunnett"},
                 {"label": "Bonferroni 校正", "value": "bonf"}],
     "value": "tukey"},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(71)
    k, n = p["k"], p["n"]
    means = p["effect"] * np.arange(k)
    groups = []
    for i in range(k):
        sd = p["sd"] * (1 + 1.5 * i / max(k - 1, 1)) if p["hetero"] else p["sd"]
        groups.append(rng.normal(means[i], sd, n))
    return {"groups": [g.tolist() for g in groups]}


def analyze(data, p):
    groups = [np.array(g, dtype=float) for g in data["groups"]]
    k = len(groups)
    n = len(groups[0])
    names = [f"组{i + 1}" for i in range(k)]
    path = []

    # ---- 预检 ----
    shapiro_ok = all(sps.shapiro(g).pvalue > 0.05 for g in groups)
    stat_lev, p_lev = sps.levene(*groups)
    hom_ok = p_lev > 0.05
    path.append(f"Shapiro 正态性: {'全部通过' if shapiro_ok else '有组偏离正态'}")
    path.append(f"Levene 方差齐性: {fmt_p(p_lev)} → {'齐' if hom_ok else '不齐'}")

    if p["approach"] == "auto":
        use_param = shapiro_ok and hom_ok
    elif p["approach"] == "param":
        use_param = True
    else:
        use_param = False

    if use_param:
        if hom_ok:
            F, pv = sps.f_oneway(*groups)
            test_name = "单因素 ANOVA（等方差）"
            # eta²
            all_ = np.concatenate(groups)
            ss_between = sum(len(g) * (g.mean() - all_.mean()) ** 2 for g in groups)
            ss_total = ((all_ - all_.mean()) ** 2).sum()
            eta2 = ss_between / ss_total if ss_total > 0 else 0
        else:
            df = welch_anova(data={"value": np.concatenate(groups),
                                   "group": np.repeat(names, n)})
            F = float(df["F"].iloc[0]); pv = float(df["p-unc"].iloc[0])
            test_name = "Welch ANOVA（方差不齐）"
            all_ = np.concatenate(groups)
            ss_between = sum(len(g) * (g.mean() - all_.mean()) ** 2 for g in groups)
            ss_total = ((all_ - all_.mean()) ** 2).sum()
            eta2 = ss_between / ss_total if ss_total > 0 else 0
        path.append(f"→ 采用 {test_name}")
    else:
        H, pv = sps.kruskal(*groups)
        test_name = "Kruskal-Wallis 检验"
        eta2 = float("nan")
        path.append(f"→ 采用 {test_name}")

    # ---- 事后检验 ----
    all_data = np.concatenate(groups)
    all_names = np.repeat(names, n)
    post_rows = []
    sig_pairs = []
    if pv < 0.05:
        if use_param:
            if p["posthoc"] == "tukey":
                res = pairwise_tukeyhsd(all_data, all_names)
                for i in range(len(res.reject)):
                    g1, g2 = res.groups[i][0], res.groups[i][1]
                    post_rows.append((f"{g1} vs {g2}", fmt(res.meandiffs[i]), fmt(res.pvalues[i]),
                                      "显著" if res.reject[i] else "ns"))
                    if res.reject[i]:
                        sig_pairs.append((names.index(g1), names.index(g2)))
            elif p["posthoc"] == "dunnett":
                df_all = pd.DataFrame({"value": all_data, "group": all_names})
                dfp = sp.posthoc_dunnett(df_all, val_col="value", group_col="group",
                                         control="组1")
                for g2 in names[1:]:
                    pvj = float(dfp.loc[g2, "组1"])
                    post_rows.append((f"组1 vs {g2}", "—", fmt_p(pvj),
                                      "显著" if pvj < 0.05 else "ns"))
                    if pvj < 0.05:
                        sig_pairs.append((0, names.index(g2)))
            else:
                pvals = []
                pairs = []
                for i in range(k):
                    for j in range(i + 1, k):
                        t, pvj = sps.ttest_ind(groups[i], groups[j], equal_var=False)
                        pairs.append((i, j)); pvals.append(pvj)
                _, padj, _, _ = multipletests(pvals, method="bonferroni")
                for (i, j), pa in zip(pairs, padj):
                    post_rows.append((f"{names[i]} vs {names[j]}", "—", fmt_p(pa),
                                      "显著" if pa < 0.05 else "ns"))
                    if pa < 0.05:
                        sig_pairs.append((i, j))
        else:
            df_all = pd.DataFrame({"value": all_data, "group": all_names})
            dfp = sp.posthoc_dunn(df_all, val_col="value", group_col="group",
                                  p_adjust="bonferroni")
            for i in range(k):
                for j in range(i + 1, k):
                    pvj = dfp.loc[names[i], names[j]]
                    post_rows.append((f"{names[i]} vs {names[j]}", "—", fmt_p(float(pvj)),
                                      "显著" if pvj < 0.05 else "ns"))
                    if pvj < 0.05:
                        sig_pairs.append((i, j))

    post_df = pd.DataFrame(post_rows, columns=["比较", "均值差", "校正 P", "判定"])

    # ---- 绘图 ----
    fig = go.Figure()
    for i, g in enumerate(groups):
        fig.add_trace(go.Box(y=g, name=names[i], boxpoints=False,
                             marker_color=PALETTE[i % len(PALETTE)],
                             line=dict(color=PALETTE[i % len(PALETTE)], width=2),
                             hovertemplate=f"{names[i]}<br>中位数 %{{y:.2f}}<extra></extra>"))
        rng = np.random.default_rng(i)
        j = rng.uniform(-0.18, 0.18, len(g))
        fig.add_trace(go.Scatter(x=[i + 1 + jj for jj in j], y=g, mode="markers",
                                 marker=dict(color=PALETTE[i % len(PALETTE)], size=5, opacity=0.6),
                                 showlegend=False, hovertemplate=f"{names[i]}: %{{y:.2f}}<extra></extra>"))
    # 显著性括号
    ymax = max(g.max() for g in groups)
    step = (ymax - min(g.min() for g in groups)) * 0.06
    for idx, (i, j) in enumerate(sig_pairs[:6]):
        y0 = ymax + step * (idx + 1.5)
        x1, x2 = i + 1, j + 1
        fig.add_shape(type="line", x0=x1, x1=x2, y0=y0, y1=y0, line=dict(color="#111", width=1.2))
        fig.add_annotation(x=(x1 + x2) / 2, y=y0 + step * 0.35, text="*", showarrow=False,
                           font=dict(size=16, color="#111"))
    corner_note(fig, f"{test_name}\n{fmt_p(pv)}\nη² = {eta2:.3f}" if not np.isnan(eta2)
                else f"{test_name}\n{fmt_p(pv)}", fs=12.5)
    fig.update_yaxes(title_text="观测值")
    fig.update_xaxes(title_text="组别")
    theme_fig(fig, height=460)

    # ANOVA 摘要表
    anova_rows = [
        ("检验方法", test_name),
        ("统计量", fmt(F if not np.isnan(eta2) else H)),
        ("P 值", fmt_p(pv)),
        ("效应量 η²", fmt(eta2) if not np.isnan(eta2) else "—"),
        ("组数 / 每组 n", f"{k} 组 / n={n}"),
    ]
    verdict = f"组间差异显著（{fmt_p(pv)}），效应量 η² = {eta2:.3f}" if pv < 0.05 and not np.isnan(eta2) else (
        f"组间差异显著（{fmt_p(pv)}）" if pv < 0.05 else "组间差异不显著")
    stats = sh.stats_card([
        sh.section("决策路径", sh.interp(" → ".join(path))),
        sh.section("ANOVA 结果", sh.kv_table(anova_rows)),
        sh.section(f"事后检验（{'Tukey' if p['posthoc'] == 'tukey' else 'Dunnett vs 组1' if p['posthoc'] == 'dunnett' else 'Bonferroni'}）",
                   sh.df_table(post_df) if len(post_df) else sh.interp("主检验不显著，未做事后比较")),
        sh.interp(f"{verdict}。" + ("图上 * 标记显著的组间比较。" if sig_pairs else "")),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "单因素 ANOVA · 多组比较与事后检验",
    "三组及以上均值比较：自动预检（Shapiro + Levene）后选择参数 ANOVA / Welch ANOVA / "
    "Kruskal-Wallis，再做 Tukey / Dunnett / Bonferroni 事后比较，图上标注显著对。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
