"""频数分布：直方图 + 频数表 + 累积（纯计算版）。"""
import numpy as np

METHOD = "frequency_distribution"


def demo_data(params=None):
    rng = np.random.default_rng(111)
    n = params.get("n", 120)
    shape = params.get("shape", "normal")
    if shape == "normal":
        x = rng.normal(10, 2.5, n)
    elif shape == "bimodal":
        x = np.concatenate([rng.normal(7, 1.2, n // 2), rng.normal(13, 1.2, n - n // 2)])
    else:
        x = rng.exponential(3.0, n) + 2
    return {"x": x.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    n = len(x)
    mode = params.get("bin_method", "sqrt")
    if mode == "manual":
        nb = int(params.get("n_bins", 15))
    elif mode == "rice":
        nb = int(np.ceil(2 * n ** (1 / 3)))
    else:
        nb = int(np.sqrt(n))
    nb = max(4, min(nb, 60))

    counts, edges = np.histogram(x, bins=nb)
    density = counts / counts.sum() * 100
    cum = np.cumsum(counts) / counts.sum() * 100
    bins = [{"low": float(edges[i]), "high": float(edges[i + 1]),
             "count": int(counts[i]), "pct": float(density[i]), "cum_pct": float(cum[i])}
            for i in range(nb)]
    return {
        "n": n, "n_bins": nb, "bins": bins,
        "interpretation": "频数分布用于观察偏态、双峰与异常聚集，是形态判断的第一步。",
    }
