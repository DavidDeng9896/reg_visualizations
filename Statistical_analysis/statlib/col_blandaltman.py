"""Bland-Altman 一致性分析（纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "bland_altman"


def demo_data(params=None):
    rng = np.random.default_rng(131)
    n = params.get("n", 50)
    m1 = rng.uniform(5, 60, n) + rng.normal(0, 2, n)
    m2 = params.get("bias", 1.2) + params.get("ratio", 1.05) * m1 + rng.normal(0, params.get("noise", 1.5), n)
    return {"m1": m1.tolist(), "m2": m2.tolist()}


def analyze(data, params=None):
    m1 = np.asarray(data["m1"], dtype=float)
    m2 = np.asarray(data["m2"], dtype=float)
    d = m2 - m1
    mean = (m1 + m2) / 2
    n = len(d)
    bias = float(d.mean())
    s = float(d.std(ddof=1))
    loa_lo, loa_hi = bias - 1.96 * s, bias + 1.96 * s

    tval = float(sps.t.ppf(0.975, n - 1))
    se_loa = float(np.sqrt(3 * s ** 2 / n))
    t_bias, p_bias = sps.ttest_1samp(d, 0)
    sl, _, _, p_reg, _ = sps.linregress(mean, d)

    return {
        "bias": bias, "diff_sd": s,
        "loa_lo": float(loa_lo), "loa_hi": float(loa_hi),
        "loa_ci95": {"lo": [float(loa_lo - tval * se_loa), float(loa_lo + tval * se_loa)],
                     "hi": [float(loa_hi - tval * se_loa), float(loa_hi + tval * se_loa)]},
        "bias_test": {"t": float(t_bias), "p": float(p_bias)},
        "proportional_bias": {"slope": float(sl), "p": float(p_reg),
                              "present": bool(p_reg < 0.05)},
        "n": n,
        "interpretation": f"偏倚 {bias:.2f}（P={p_bias:.3g}），95% LoA {loa_lo:.2f}~{loa_hi:.2f}；"
                          f"比例偏倚{'存在' if p_reg < 0.05 else '不显著'}。"
                          "一致性界限是否临床可接受需领域判断。",
    }
