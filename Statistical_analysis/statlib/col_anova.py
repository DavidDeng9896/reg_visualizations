"""单因素 ANOVA + 事后检验（含预检决策，纯计算版）。"""
import numpy as np
import pandas as pd
from scipy import stats as sps
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from pingouin import welch_anova
import scikit_posthocs as sp

METHOD = "anova"


def demo_data(params=None):
    rng = np.random.default_rng(71)
    k, n = params.get("k", 4), params.get("n", 8)
    effect = params.get("effect", 4.0)
    sd = params.get("sd", 4.0)
    hetero = params.get("hetero", False)
    groups = []
    for i in range(k):
        gsd = sd * (1 + 1.5 * i / max(k - 1, 1)) if hetero else sd
        groups.append(rng.normal(effect * i, gsd, n))
    return {"groups": [g.tolist() for g in groups]}


def analyze(data, params=None):
    params = params or {}
    groups = [np.asarray(g, dtype=float) for g in data["groups"]]
    k = len(groups); n = len(groups[0])
    names = [f"G{i + 1}" for i in range(k)]
    path = []

    shapiro_ok = all(sps.shapiro(g).pvalue > 0.05 for g in groups)
    _, p_lev = sps.levene(*groups)
    hom_ok = p_lev > 0.05
    path.append(f"Shapiro={'通过' if shapiro_ok else '偏离'}; Levene P={p_lev:.3f}={'齐' if hom_ok else '不齐'}")

    approach = params.get("approach", "auto")
    use_param = shapiro_ok and hom_ok if approach == "auto" else approach == "param"
    all_data = np.concatenate(groups)
    all_names = np.repeat(names, n)

    if use_param:
        if hom_ok:
            F, pv = sps.f_oneway(*groups); test_name = "ANOVA"
        else:
            df = welch_anova(data={"value": all_data, "group": all_names})
            F, pv = float(df["F"].iloc[0]), float(df["p-unc"].iloc[0])
            test_name = "Welch ANOVA"
        ss_between = sum(len(g) * (g.mean() - all_data.mean()) ** 2 for g in groups)
        ss_total = ((all_data - all_data.mean()) ** 2).sum()
        eta2 = float(ss_between / ss_total) if ss_total > 0 else 0.0
    else:
        H, pv = sps.kruskal(*groups); test_name = "Kruskal-Wallis"
        F, eta2 = float(H), None
    path.append(f"→ {test_name}")

    posthoc = []
    if pv < 0.05:
        if use_param:
            method = params.get("posthoc", "tukey")
            if method == "dunnett":
                dfa = pd.DataFrame({"value": all_data, "group": all_names})
                dfp = sp.posthoc_dunnett(dfa, val_col="value", group_col="group", control="G1")
                for g2 in names[1:]:
                    posthoc.append({"pair": f"G1 vs {g2}", "p_adj": float(dfp.loc[g2, "G1"])})
            else:
                res = pairwise_tukeyhsd(all_data, all_names)
                for i in range(len(res.reject)):
                    g1, g2 = res.groups[i]
                    posthoc.append({"pair": f"{g1} vs {g2}", "p_adj": float(res.pvalues[i]),
                                    "significant": bool(res.reject[i])})
        else:
            dfa = pd.DataFrame({"value": all_data, "group": all_names})
            dfp = sp.posthoc_dunn(dfa, val_col="value", group_col="group", p_adjust="bonferroni")
            for i in range(k):
                for j in range(i + 1, k):
                    posthoc.append({"pair": f"{names[i]} vs {names[j]}",
                                    "p_adj": float(dfp.loc[names[i], names[j]])})
        for r in posthoc:
            r["significant"] = bool(r["p_adj"] < params.get("fdr", 0.05))

    return {
        "test": test_name, "statistic": float(F), "p_value": float(pv),
        "eta2": eta2, "k": k, "n_per_group": n, "decision_path": path,
        "posthoc": posthoc, "n_significant_pairs": sum(1 for r in posthoc if r["significant"]),
        "significant": bool(pv < 0.05),
        "interpretation": f"{test_name} {('显著，η²=' + f'{eta2:.3f}') if eta2 is not None else '显著'}（P={pv:.3g}）"
                          f"；{sum(1 for r in posthoc if r['significant'])} 对事后比较显著。",
    }
