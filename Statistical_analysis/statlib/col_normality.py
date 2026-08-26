"""正态性/对数正态性检验（纯计算版）。"""
import numpy as np
from scipy import stats as sps

METHOD = "normality_test"


def demo_data(params=None):
    rng = np.random.default_rng(101)
    n = params.get("n", 40)
    dist = params.get("dist", "normal")
    if dist == "normal":
        x = rng.normal(0, 1, n)
    elif dist == "lognorm":
        x = rng.lognormal(0, 0.6, n)
    elif dist == "exp":
        x = rng.exponential(1.0, n)
    elif dist == "uniform":
        x = rng.uniform(-1.7, 1.7, n)
    else:
        x = np.concatenate([rng.normal(-1.5, 0.5, n // 2), rng.normal(1.5, 0.5, n - n // 2)])
    return {"x": x.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    n = len(x)
    tests = []

    if n >= 3 and params.get("shapiro", True):
        w, p = sps.shapiro(x)
        tests.append({"test": "Shapiro-Wilk", "statistic": float(w), "p_value": float(p),
                      "normal": bool(p > 0.05)})
    if n >= 20 and params.get("dagostino", True):
        st, p = sps.normaltest(x)
        tests.append({"test": "D'Agostino-Pearson", "statistic": float(st), "p_value": float(p),
                      "normal": bool(p > 0.05)})
    if params.get("ks", True):
        loc, scale = float(x.mean()), float(x.std(ddof=1))
        # 用 callable CDF 形式（scipy>=1.14 弃用 string-dist + args 多参签名，callable 形式跨版本兼容）
        st, p = sps.kstest(x, lambda v: sps.norm.cdf(v, loc=loc, scale=scale)) if scale > 0 else (0.0, 1.0)
        tests.append({"test": "Kolmogorov-Smirnov", "statistic": float(st), "p_value": float(p),
                      "normal": bool(p > 0.05)})
    if params.get("test_lognorm", False):
        lx = np.log(x[x > 0])
        if len(lx) >= 3:
            w, p = sps.shapiro(lx)
            tests.append({"test": "Lognormal (log Shapiro)", "statistic": float(w),
                          "p_value": float(p), "normal": bool(p > 0.05)})

    n_reject = sum(1 for t in tests if not t["normal"])
    return {
        "n": n, "tests": tests,
        "verdict": "normal" if n_reject == 0 else f"reject_normal ({n_reject}/{len(tests)})",
        "interpretation": f"{'数据基本服从正态' if n_reject == 0 else f'{n_reject}/{len(tests)} 项检验拒绝正态'}。"
                          "小样本（n<20）Shapiro 功效低，检验不拒绝也不能完全排除偏离正态。",
    }
