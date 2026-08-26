"""非线性回归/曲线拟合（纯计算版）：4PL/3PL/5PL/MM/指数衰减 + 权重/稳健/约束/模型比较。"""
import numpy as np
from lmfit import Model
from scipy.stats import t
from statsmodels.stats.multitest import multipletests

METHOD = "nonlinear_regression"

MODELS = {
    "four_pl": (lambda x, Bottom, Top, LogEC50, Hill:
                Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill)), ["Bottom", "Top", "LogEC50", "Hill"]),
    "three_pl": (lambda x, Bottom, Top, LogEC50:
                 Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * 1.0)), ["Bottom", "Top", "LogEC50"]),
    "five_pl": (lambda x, Bottom, Top, LogEC50, Hill, S:
                Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill)) ** S, ["Bottom", "Top", "LogEC50", "Hill", "S"]),
    "mm": (lambda x, Vmax, Km: Vmax * x / (Km + x), ["Vmax", "Km"]),
    "exp_decay": (lambda x, Y0, k, Plateau: Plateau + (Y0 - Plateau) * np.exp(-k * x), ["Y0", "k", "Plateau"]),
}


def demo_data(params=None):
    rng = np.random.default_rng(42)
    n = params.get("n_points", 9)
    reps = params.get("reps", 3)
    x = np.linspace(-2.0, 2.0, n)
    ybar = MODELS["four_pl"][0](x, params.get("bottom", 10), params.get("top", 100),
                                params.get("logec50", 0.0), params.get("hill", 1.0))
    sd = params.get("noise", 0.04) * (params.get("top", 100) - params.get("bottom", 10)) * 2
    y = np.concatenate([rng.normal(mu, sd, reps) for mu in ybar])
    x_all = np.repeat(x, reps)
    return {"x": x_all.tolist(), "y": y.tolist()}


def _weights(y, mode):
    a = np.clip(np.abs(y), 1e-9, None)
    return {"equal": np.ones_like(y), "1/y": 1.0 / a, "1/y2": 1.0 / a ** 2,
            "y": a, "y2": a ** 2}[mode]


def _guess(model, name, x, y):
    p = model.make_params()
    ymin, ymax = y.min(), y.max()
    if name in ("four_pl", "three_pl", "five_pl"):
        p["Bottom"].set(value=ymin); p["Top"].set(value=ymax)
        p["LogEC50"].set(value=np.median(x))
        if name == "four_pl":
            p["Hill"].set(value=1.0)
        elif name == "five_pl":
            p["Hill"].set(value=1.0); p["S"].set(value=1.0)
    elif name == "mm":
        p["Vmax"].set(value=ymax); p["Km"].set(value=np.median(x))
    else:
        p["Y0"].set(value=ymax); p["Plateau"].set(value=ymin); p["k"].set(value=1.0)
    return p


def _aicc(res, n):
    k = len(res.var_names)
    return float("nan") if n <= k + 1 else float(res.aic + 2 * k * (k + 1) / (n - k - 1))


def _fit(model, name, x, y, weights, robust):
    p = _guess(model, name, x, y)
    if robust:
        return model.fit(y, p, x=x, weights=weights, method="least_squares",
                         fit_kws={"loss": "soft_l1"})
    return model.fit(y, p, x=x, weights=weights)


def analyze(data, params=None):
    """返回参数估计、SE/CI、拟合优度；可选模型比较表。"""
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    name = params.get("model", "four_pl")
    if name not in MODELS:
        raise KeyError(f"未知模型 {name}，可选 {list(MODELS)}")
    fn, pnames = MODELS[name]
    model = Model(fn)
    weights = _weights(y, params.get("weighting", "equal"))
    result = _fit(model, name, x, y, weights, bool(params.get("robust", False)))

    param_rows = []
    for pn in pnames:
        par = result.params[pn]
        se = par.stderr
        lo = hi = None
        if se is not None:
            lo, hi = par.value - 1.96 * se, par.value + 1.96 * se
        param_rows.append({"param": pn, "value": float(par.value),
                           "se": None if se is None else float(se),
                           "ci95": None if lo is None else [float(lo), float(hi)]})

    n = len(y)
    k = len(pnames)
    derived = {}
    if name in ("four_pl", "three_pl", "five_pl"):
        logec = result.params["LogEC50"].value
        se = result.params["LogEC50"].stderr
        derived = {"ic50": float(10 ** logec),
                   "ic50_ci95": None if se is None else [float(10 ** (logec - 1.96 * se)),
                                                         float(10 ** (logec + 1.96 * se))]}
    elif name in ("exp_decay",):
        kk = result.params["k"].value
        derived = {"half_life": float(np.log(2) / kk)}

    comp = []
    if params.get("compare", False):
        for cname in MODELS:
            if cname == name:
                continue
            try:
                fn2, _ = MODELS[cname]
                r2 = _fit(Model(fn2), cname, x, y, weights, bool(params.get("robust", False)))
                comp.append({"model": cname, "aicc": _aicc(r2, n),
                             "r2": float(r2.rsquared)})
            except Exception:
                pass
        if comp:
            best = min(comp, key=lambda c: c["aicc"])
            for c in comp:
                c["delta_aicc"] = round(c["aicc"] - best["aicc"], 3)

    return {
        "model": name, "n": n, "k": k,
        "params": param_rows, "derived": derived,
        "r2": float(result.rsquared),
        "aicc": _aicc(result, n), "bic": float(result.bic),
        "redchi": float(result.redchi),
        "model_comparison": comp,
        "interpretation": f"{name} 拟合 R²={result.rsquared:.3f}；"
                          + ("IC50=" + f"{derived['ic50']:.3g}" if "ic50" in derived else ""),
    }
