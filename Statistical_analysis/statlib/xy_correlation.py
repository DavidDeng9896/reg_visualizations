"""相关分析 Pearson/Spearman/Kendall（纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "correlation"


def demo_data(params=None):
    rng = np.random.default_rng(41)
    rho = params.get("rho", 0.7)
    n = params.get("n", 60)
    z = rng.normal(0, 1, (2, n))
    L = np.linalg.cholesky(np.array([[1, rho], [rho, 1]]))
    d = L @ z
    x, y = d[0], d[1]
    if params.get("monotone"):
        x = np.sort(x)
        y = np.exp(x * 0.9) + rng.normal(0, 0.15, n) * 2
    return {"x": x.tolist(), "y": y.tolist()}


def _fisher_ci(r, n, k=1.0):
    z = np.arctanh(np.clip(r, -0.99999, 0.99999))
    se = k / np.sqrt(n - 3)
    return [float(np.tanh(z - 1.96 * se)), float(np.tanh(z + 1.96 * se))]


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    n = len(x)
    method = params.get("method", "pearson")

    if method == "pearson":
        r, p = sps.pearsonr(x, y)
        ci = _fisher_ci(r, n, 1.0)
        label = "Pearson r"
    elif method == "spearman":
        r, p = sps.spearmanr(x, y)
        ci = _fisher_ci(r, n, 1.029563)
        label = "Spearman rho"
    else:
        r, p = sps.kendalltau(x, y)
        ci = None
        label = "Kendall tau"

    strength = "strong" if abs(r) >= 0.7 else ("moderate" if abs(r) >= 0.4 else "weak")
    return {
        "method": method, "label": label,
        "r": float(r), "p_value": float(p), "ci95": ci,
        "n": n, "strength": strength,
        "interpretation": f"{label} = {r:.3f}，{strength} {'positive' if r > 0 else 'negative'} "
                          f"correlation (P={p:.3g})。相关不代表因果。",
    }
