"""t 检验（含 Shapiro 预检决策路径，纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "t_test"


def demo_data(params=None):
    rng = np.random.default_rng(61)
    n = params.get("n", 12)
    design = params.get("design", "unpaired")
    mu_c, mu_t = params.get("mu_ctrl", 20), params.get("mu_trt", 28)
    sd = params.get("sd", 5)
    if design == "onesample":
        return {"x": rng.normal(mu_t, sd, n).tolist(), "design": "onesample", "mu0": mu_c}
    if design == "unpaired":
        return {"a": rng.normal(mu_c, sd, n).tolist(), "b": rng.normal(mu_t, sd, n).tolist(),
                "design": "unpaired"}
    base = rng.normal(0, 1, n)
    corr = params.get("paired_corr", 0.6)
    a = mu_c + sd * base
    b = mu_t + sd * (corr * base + np.sqrt(1 - corr ** 2) * rng.normal(0, 1, n))
    return {"a": a.tolist(), "b": b.tolist(), "design": "paired"}


def analyze(data, params=None):
    params = params or {}
    design = data.get("design", "unpaired")
    gauss = params.get("gauss", "auto")
    path = []

    if design == "onesample":
        x = np.asarray(data["x"], dtype=float); mu0 = data.get("mu0", 0.0)
    else:
        a = np.asarray(data["a"], dtype=float); b = np.asarray(data["b"], dtype=float)

    use_param = gauss != "no"
    if gauss == "auto":
        if design == "onesample":
            _, sp = sps.shapiro(x); use_param = sp > 0.05
            path.append(f"Shapiro P={sp:.3f} → {'参数' if use_param else '非参数'}")
        elif design == "paired":
            _, sp = sps.shapiro(b - a); use_param = sp > 0.05
            path.append(f"差值 Shapiro P={sp:.3f} → {'参数' if use_param else '非参数'}")
        else:
            _, p1 = sps.shapiro(a); _, p2 = sps.shapiro(b)
            use_param = p1 > 0.05 and p2 > 0.05
            path.append(f"两组 Shapiro P1={p1:.3f},P2={p2:.3f} → {'参数' if use_param else '非参数'}")

    if design == "unpaired":
        if use_param:
            if params.get("equal_var", "welch") == "welch":
                stat, pv = sps.ttest_ind(a, b, equal_var=False); name = "Welch t"
            else:
                stat, pv = sps.ttest_ind(a, b, equal_var=True); name = "Student t"
            d = b.mean() - a.mean()
            se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
            ci = [d - 1.96 * se, d + 1.96 * se]
        else:
            stat, pv = sps.mannwhitneyu(a, b); name = "Mann-Whitney U"
            d = b.mean() - a.mean(); ci = None
        eff = (b.mean() - a.mean()) / np.sqrt((a.std(ddof=1) ** 2 + b.std(ddof=1) ** 2) / 2)
    elif design == "paired":
        diff = b - a
        if use_param:
            stat, pv = sps.ttest_rel(a, b); name = "Paired t"
            se = diff.std(ddof=1) / np.sqrt(len(diff))
            ci = [diff.mean() - 1.96 * se, diff.mean() + 1.96 * se]
        else:
            stat, pv = sps.wilcoxon(a, b); name = "Wilcoxon"
            ci = None
        d = diff.mean()
        eff = d / diff.std(ddof=1) if diff.std(ddof=1) > 0 else 0
    else:
        if use_param:
            stat, pv = sps.ttest_1samp(x, mu0); name = "One-sample t"
            se = x.std(ddof=1) / np.sqrt(len(x))
            ci = [x.mean() - mu0 - 1.96 * se, x.mean() - mu0 + 1.96 * se]
        else:
            stat, pv = sps.wilcoxon(x - mu0); name = "Wilcoxon signed-rank"
            ci = None
        d = x.mean() - mu0
        eff = d / x.std(ddof=1) if x.std(ddof=1) > 0 else 0

    if params.get("tail", 2) == 1:
        pv = pv / 2
    return {
        "design": design, "test": name, "statistic": float(stat),
        "p_value": float(pv), "mean_diff": float(d), "ci95": ci,
        "cohens_d": float(eff), "n": int(len(a if design != "onesample" else x)),
        "decision_path": path,
        "significant": bool(pv < 0.05),
        "interpretation": f"{name}：{'显著（P<0.05）' if pv < 0.05 else '不显著'}，Cohen's d={eff:.2f}",
    }
