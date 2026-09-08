"""离群点检测：IQR / Grubbs / ROUT(FDR)（纯计算版）。"""
import numpy as np
from scipy import stats as sps
from statsmodels.stats.multitest import multipletests

METHOD = "outlier_detection"


def demo_data(params=None):
    rng = np.random.default_rng(141)
    n = params.get("n", 30)
    x = rng.normal(10, 2, n)
    n_out = params.get("n_out", 2)
    if n_out > 0:
        idx = rng.choice(len(x), n_out, replace=False)
        x[idx] = x[idx] + rng.choice([-1, 1], n_out) * params.get("out_scale", 4.0) * 2
    return {"x": x.tolist()}


def _grubbs(x, alpha):
    x = x.copy(); n = len(x)
    out = np.zeros(n, dtype=bool); mask = np.ones(n, dtype=bool)
    for _ in range(n // 2):
        xx = x[mask]
        if len(xx) < 3:
            break
        m, s = xx.mean(), xx.std(ddof=1)
        if s == 0:
            break
        z = np.abs(xx - m) / s
        i = np.argmax(z); G = z[i]
        tcrit = sps.t.ppf(1 - alpha / (2 * len(xx)), len(xx) - 2)
        gcrit = (len(xx) - 1) / np.sqrt(len(xx)) * np.sqrt(tcrit ** 2 / (len(xx) - 2 + tcrit ** 2))
        if G > gcrit:
            orig = np.where(mask)[0][i]
            out[orig] = True; mask[orig] = False
        else:
            break
    return out


def _rout(x, Q):
    med = np.median(x)
    sd = 1.4826 * np.median(np.abs(x - med))
    if sd == 0:
        sd = x.std(ddof=1)
    if sd == 0:
        return np.zeros(len(x), dtype=bool)
    z = np.abs(x - med) / sd
    pvals = np.clip(2 * (1 - sps.t.cdf(z, len(x) - 1)), 1e-15, 1)
    _, qvals, _, _ = multipletests(pvals, alpha=Q, method="fdr_bh")
    return qvals < Q


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    n = len(x)
    method = params.get("method", "grubbs")

    if method == "iqr":
        q1, q3 = np.percentile(x, [25, 75]); iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        out = (x < lo) | (x > hi)
        desc = f"IQR：界限 {lo:.3g}~{hi:.3g}"
    elif method == "rout":
        out = _rout(x, params.get("alpha", 0.05))
        desc = f"ROUT(FDR Q={params.get('alpha', 0.05)})"
    else:
        out = _grubbs(x, params.get("alpha", 0.05))
        desc = f"Grubbs(α={params.get('alpha', 0.05)})"

    idx = np.where(out)[0]
    return {
        "method": method, "description": desc,
        "outlier_indices": idx.tolist(), "outlier_values": x[out].tolist(),
        "n_outliers": int(out.sum()), "n": n,
        "mean": float(x.mean()), "sd": float(x.std(ddof=1)),
        "interpretation": f"{desc} 检测到 {int(out.sum())} 个离群点。"
                          "统计学证据不能替代实验判断，剔除前应核查原始记录。",
    }
