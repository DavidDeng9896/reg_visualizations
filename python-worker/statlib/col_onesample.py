"""单样本检验 vs 理论值（纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "one_sample_test"


def demo_data(params=None):
    rng = np.random.default_rng(81)
    n = params.get("n", 18)
    x = rng.normal(params.get("mu_true", 12), params.get("sd", 4), n)
    if params.get("skewed"):
        x = params.get("mu_true", 12) + rng.exponential(params.get("sd", 4), n) - params.get("sd", 4)
    return {"x": x.tolist(), "mu0": params.get("mu0", 10)}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    mu0 = data.get("mu0", 0.0)
    path = []
    use_t = params.get("approach", "auto") != "w"
    if params.get("approach", "auto") == "auto":
        _, sp = sps.shapiro(x)
        use_t = sp > 0.05
        path.append(f"Shapiro P={sp:.3f} → {'t' if use_t else 'Wilcoxon'}")

    if use_t:
        stat, pv = sps.ttest_1samp(x, mu0); name = "One-sample t"
        se = x.std(ddof=1) / np.sqrt(len(x))
        ci = [x.mean() - mu0 - 1.96 * se, x.mean() - mu0 + 1.96 * se]
    else:
        stat, pv = sps.wilcoxon(x - mu0); name = "Wilcoxon signed-rank"
        ci = None
    d = x.mean() - mu0
    eff = d / x.std(ddof=1) if x.std(ddof=1) > 0 else 0
    return {
        "test": name, "statistic": float(stat), "p_value": float(pv),
        "mean": float(x.mean()), "mean_minus_mu0": float(d), "ci95": ci,
        "cohens_d": float(eff), "n": int(len(x)), "decision_path": path,
        "significant": bool(pv < 0.05),
        "interpretation": f"样本均值 {x.mean():.2f} 与理论值 {mu0} 差异{'显著' if pv < 0.05 else '不显著'}（P={pv:.3g}）。",
    }
