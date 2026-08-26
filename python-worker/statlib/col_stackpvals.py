"""P 值堆栈：批量检验 + 多重比较校正（纯计算版）。"""
import numpy as np
from scipy import stats as sps
from statsmodels.stats.multitest import multipletests

METHOD = "p_value_stack"


def demo_data(params=None):
    rng = np.random.default_rng(151)
    g, n = params.get("n_genes", 100), params.get("n", 8)
    ctrl = rng.normal(0, params.get("sd", 1.0), (g, n))
    trt = rng.normal(0, params.get("sd", 1.0), (g, n))
    n_de = int(round(g * params.get("prop_de", 0.15)))
    de_idx = rng.choice(g, n_de, replace=False)
    trt[de_idx] += rng.choice([-1, 1], n_de)[:, None] * params.get("effect", 2.2) * params.get("sd", 1.0)
    return {"ctrl": ctrl.tolist(), "trt": trt.tolist(), "de_idx": sorted(de_idx.tolist())}


def analyze(data, params=None):
    params = params or {}
    ctrl = np.asarray(data["ctrl"], dtype=float)
    trt = np.asarray(data["trt"], dtype=float)
    g, n = ctrl.shape
    true_de = np.isin(np.arange(g), data.get("de_idx", []))
    test = params.get("test", "t")
    pvals = np.empty(g)
    for i in range(g):
        if test == "t":
            pvals[i] = sps.ttest_ind(ctrl[i], trt[i], equal_var=False).pvalue
        else:
            try:
                pvals[i] = sps.mannwhitneyu(ctrl[i], trt[i]).pvalue
            except ValueError:
                pvals[i] = 1.0

    correction = params.get("correction", "fdr_bh")
    if correction == "none":
        qvals = pvals
    else:
        _, qvals, _, _ = multipletests(pvals, alpha=params.get("fdr", 0.05), method=correction)
    sig = qvals < params.get("fdr", 0.05)

    tp = int(np.sum(sig & true_de)); fp = int(np.sum(sig & ~true_de))
    fn = int(np.sum(~sig & true_de))
    sens = tp / max(true_de.sum(), 1); prec = tp / max(tp + fp, 1)

    order = np.argsort(pvals)[:10]
    top = [{"gene": int(i), "lfc": float(trt[i].mean() - ctrl[i].mean()),
            "p": float(pvals[i]), "q": float(qvals[i]), "significant": bool(qvals[i] < params.get("fdr", 0.05))}
           for i in order]
    return {
        "n_genes": g, "n_per_group": n, "test": "Welch t" if test == "t" else "Mann-Whitney",
        "correction": correction,
        "pvals": pvals.tolist(), "qvals": qvals.tolist(),
        "lfc": (trt.mean(axis=1) - ctrl.mean(axis=1)).tolist(),
        "n_sig_raw": int(np.sum(pvals < params.get("fdr", 0.05))),
        "n_sig_adj": int(sig.sum()), "n_true_de": int(true_de.sum()),
        "sensitivity": float(sens), "precision": float(prec),
        "top10": top,
        "interpretation": f"{g} 基因批量检验（{correction} 校正），{int(sig.sum())} 个显著"
                          f"（FDR<{params.get('fdr', 0.05)}）；灵敏度 {sens:.2f}、精确率 {prec:.2f}。",
    }
