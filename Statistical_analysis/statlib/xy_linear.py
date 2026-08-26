"""简单线性回归 Y = a + bX（纯计算版，独立于 UI 框架）。"""
import numpy as np
import statsmodels.api as sm

METHOD = "linear_regression"


def demo_data(params=None):
    rng = np.random.default_rng(42)
    n = params.get("n", 20)
    x = np.linspace(0.5, 20, n)
    y = params.get("intercept", 2.0) + params.get("slope", 1.2) * x \
        + rng.normal(0, params.get("noise", 1.5), n)
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, params=None):
    """返回可 JSON 序列化的统计结果 dict。"""
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    force_zero = bool(params.get("force_zero", False))

    X = x[:, None] if force_zero else sm.add_constant(x)
    res = sm.OLS(y, X).fit()

    slo, shi = res.conf_int()[-1]
    stats = {
        "slope": float(res.params[-1]), "slope_se": float(res.bse[-1]),
        "slope_ci": [float(slo), float(shi)],
        "intercept": float(res.params[0] if not force_zero else 0.0),
        "intercept_se": float(res.bse[0]) if not force_zero else None,
        "t": float(res.tvalues[-1]), "p_value": float(res.pvalues[-1]),
        "r2": float(res.rsquared), "r2_adj": float(res.rsquared_adj),
        "f_value": float(res.fvalue), "f_pvalue": float(res.f_pvalue),
        "residual_sd": float(np.sqrt(res.mse_resid)),
        "n": int(len(x)), "force_zero": force_zero,
        "equation": f"y = {res.params[0]:.4g} + {res.params[-1]:.4g}x" if not force_zero
                    else f"y = {res.params[-1]:.4g}x",
        "interpretation": f"线性回归{'显著' if res.pvalues[-1] < 0.05 else '不显著'}（P={res.pvalues[-1]:.3g}）"
                          f"，R²={res.rsquared:.3f}，X 每增 1 单位 Y 平均变化 {res.params[-1]:.3g}。",
    }
    return stats
