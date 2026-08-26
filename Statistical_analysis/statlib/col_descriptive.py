"""描述统计（纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "descriptive_statistics"


def demo_data(params=None):
    rng = np.random.default_rng(91)
    n = params.get("n", 80)
    sd = params.get("sd", 3.0)
    shape = params.get("shape", "normal")
    if shape == "normal":
        x = rng.normal(10, sd, n)
    elif shape == "lognorm":
        x = rng.lognormal(np.log(10), np.log(1 + sd / 10), n)
    elif shape == "bimodal":
        x = np.concatenate([rng.normal(6, sd * 0.5, n // 2), rng.normal(14, sd * 0.5, n - n // 2)])
    else:
        x = rng.uniform(10 - sd * 1.7, 10 + sd * 1.7, n)
    return {"x": x.tolist()}


def analyze(data, params=None):
    x = np.asarray(data["x"], dtype=float)
    n = len(x)
    sem = float(x.std(ddof=1) / np.sqrt(n))
    skew = float(sps.skew(x))
    kurt = float(sps.kurtosis(x))
    return {
        "n": n, "mean": float(x.mean()), "median": float(np.median(x)),
        "sd": float(x.std(ddof=1)), "sem": sem,
        "ci95": [float(x.mean() - 1.96 * sem), float(x.mean() + 1.96 * sem)],
        "q1": float(np.percentile(x, 25)), "q3": float(np.percentile(x, 75)),
        "iqr": float(np.percentile(x, 75) - np.percentile(x, 25)),
        "min": float(x.min()), "max": float(x.max()),
        "skewness": skew, "kurtosis": kurt,
        "shape": "right-skew" if skew > 0.5 else ("left-skew" if skew < -0.5 else "approx-symmetric"),
        "interpretation": f"均值 {x.mean():.2f}、中位数 {np.median(x):.2f}；"
                          f"{'近似对称' if abs(skew) < 0.5 else '分布偏态'}（偏度 {skew:.2f}）。",
    }
