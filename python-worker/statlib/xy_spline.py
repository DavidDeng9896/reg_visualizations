"""样条 / LOWESS 平滑拟合（纯计算版）。"""
import numpy as np
from scipy.interpolate import UnivariateSpline
from statsmodels.nonparametric.smoothers_lowess import lowess

METHOD = "spline_lowess"


def _shape(x, name):
    if name == "sin":
        return np.sin(x * 1.8) * 2 + 0.3 * x
    if name == "saturate":
        return 5 * (1 - np.exp(-0.35 * x))
    return 4 * np.exp(-0.5 * (x - 6) ** 2) + 0.4


def demo_data(params=None):
    rng = np.random.default_rng(7)
    n = params.get("n", 40)
    kind = params.get("shape", "sin")
    x = np.linspace(0, 12, n)
    y = _shape(x, kind) + rng.normal(0, params.get("noise", 0.12), n)
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    k = int(params.get("k", 3))
    s = float(params.get("smooth", 3.0))
    frac = float(params.get("frac", 0.25))

    spline = {"rmse": None, "k": k, "s": s}
    try:
        spl = UnivariateSpline(x, y, k=k, s=s)
        spline["rmse"] = float(np.sqrt(np.mean((y - spl(x)) ** 2)))
        spline["fit_y"] = spl(np.linspace(x.min(), x.max(), 200)).tolist()
    except Exception as e:
        spline["error"] = str(e)

    lowess_res = {"frac": frac, "rmse": None}
    try:
        lo = lowess(y, x, frac=frac, it=3, return_sorted=True)
        lowess_res["rmse"] = float(np.sqrt(np.mean((y - np.interp(x, lo[:, 0], lo[:, 1])) ** 2)))
        lowess_res["fit_y"] = np.interp(np.linspace(x.min(), x.max(), 200), lo[:, 0], lo[:, 1]).tolist()
    except Exception as e:
        lowess_res["error"] = str(e)

    best = None
    if spline["rmse"] is not None and lowess_res["rmse"] is not None:
        best = "spline" if spline["rmse"] < lowess_res["rmse"] else "lowess"
    return {
        "n": int(len(x)), "spline": spline, "lowess": lowess_res, "best": best,
        "interpretation": f"样条 RMSE={spline['rmse']:.4g}、LOWESS RMSE={lowess_res['rmse']:.4g}"
                          f"；当前 {best} 残差更小。" if best else "调节平滑参数观察拟合变化。",
    }
