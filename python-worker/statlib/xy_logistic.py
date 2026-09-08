"""S 形剂量-反应（4PL/5PL 逻辑曲线）+ 二分类概率（纯计算版）。"""
import numpy as np
from lmfit import Model

METHOD = "logistic_regression"


def _pl5(x, Bottom, Top, LogEC50, Hill, S):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill)) ** S


def demo_data(params=None):
    rng = np.random.default_rng(2024)
    n = params.get("n_points", 9)
    reps = params.get("reps", 4)
    x = np.linspace(-2.0, 2.0, n)
    ybar = _pl5(x, params.get("bottom", 10), params.get("top", 100),
                params.get("logec50", 0.0), params.get("hill", 1.0), params.get("asym", 1.0))
    sd = params.get("noise", 0.03) * 90 * 2
    y, x_all, resp = [], [], []
    for xi, mu in zip(x, ybar):
        for _ in range(reps):
            v = rng.normal(mu, sd)
            y.append(v); x_all.append(xi); resp.append(int(v > 50))
    return {"x": x_all, "y": y, "resp": resp}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    resp = np.asarray(data.get("resp", (y > 50).astype(int)), dtype=int)

    model = Model(_pl5)
    p = model.make_params(Bottom=dict(value=y.min()), Top=dict(value=y.max()),
                          LogEC50=dict(value=np.median(x)), Hill=dict(value=1.0), S=dict(value=1.0))
    use_5pl = bool(params.get("five_pl", False))
    if not use_5pl:
        p["S"].set(value=1.0, vary=False)
    result = model.fit(y, p, x=x)

    logec = result.params["LogEC50"].value
    hill = result.params["Hill"].value
    se = result.params["LogEC50"].stderr
    ic50 = float(10 ** logec)
    ic_ci = None if se is None else [float(10 ** (logec - 1.96 * se)), float(10 ** (logec + 1.96 * se))]

    # 二分类准确率
    pred_frac = 1 / (1 + 10 ** ((logec - x) * hill))
    acc = float(np.mean((pred_frac > 0.5).astype(int) == resp))

    return {
        "model": "5PL" if use_5pl else "4PL",
        "params": {pn: float(result.params[pn].value) for pn in result.var_names},
        "ic50": ic50, "ic50_ci95": ic_ci,
        "hill": float(hill),
        "r2": float(result.rsquared),
        "classification_accuracy": acc,
        "n": int(len(y)),
        "interpretation": f"{'5PL' if use_5pl else '4PL'} 拟合 IC50={ic50:.3g}，Hill={hill:.2f}"
                          + ("（偏离1提示多位点/协同）" if abs(hill - 1) > 0.4 else "（符合单位点模型）"),
    }
