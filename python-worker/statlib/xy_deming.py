"""Deming 回归（Model II，X/Y 均有误差，纯计算版）。"""
import numpy as np

METHOD = "deming_regression"


def demo_data(params=None):
    rng = np.random.default_rng(21)
    n = params.get("n", 25)
    x_true = np.linspace(1, 12, n) + rng.normal(0, 0.3, n)
    y_true = params.get("intercept", 0.5) + params.get("slope", 1.0) * x_true
    x = x_true + rng.normal(0, params.get("sd_x", 0.4), n)
    y = y_true + rng.normal(0, params.get("sd_y", 0.4), n)
    return {"x": x.tolist(), "y": y.tolist(), "var_x": 0.4 ** 2, "var_y": 0.4 ** 2}


def _deming(x, y, lam):
    xm, ym = x.mean(), y.mean()
    sxx = np.sum((x - xm) ** 2); syy = np.sum((y - ym) ** 2)
    sxy = np.sum((x - xm) * (y - ym))
    if sxy == 0:
        return 1.0, ym - xm
    b = (syy - lam * sxx + np.sqrt((syy - lam * sxx) ** 2 + 4 * lam * sxy ** 2)) / (2 * sxy)
    return ym - b * xm, b


def analyze(data, params=None):
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    if params.get("lambda_source", "true") == "true":
        lam = float(data.get("var_x", 1.0) / data.get("var_y", 1.0))
    else:
        lam = float(params.get("lam_manual", 1.0))

    a, b = _deming(x, y, lam)
    # jackknife SE
    bs = np.array([_deming(np.delete(x, i), np.delete(y, i), lam)[1] for i in range(len(x))])
    se_b = float(np.sqrt((len(x) - 1) / len(x) * np.sum((bs - bs.mean()) ** 2)))

    # OLS 对照
    from scipy import stats as sps
    ols = sps.linregress(x, y)
    return {
        "intercept": float(a), "slope": float(b),
        "slope_se": se_b, "slope_ci95": [float(b - 1.96 * se_b), float(b + 1.96 * se_b)],
        "lambda": lam, "lambda_source": "true" if params.get("lambda_source", "true") == "true" else "manual",
        "ols_slope": float(ols.slope), "n": int(len(x)),
        "interpretation": f"Deming 斜率 {b:.3f}（95%CI {b - 1.96 * se_b:.3f}~{b + 1.96 * se_b:.3f}）"
                          f"；OLS（仅Y误差）斜率 {ols.slope:.3f}。两仪器都有误差时应以 Deming 为准。",
    }
