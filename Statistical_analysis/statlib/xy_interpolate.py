"""标准曲线插值：4PL/线性拟合后反算未知样本浓度（纯计算版）。"""
import numpy as np
from lmfit import Model

METHOD = "standard_curve_interpolation"


def _pl4(x, Bottom, Top, LogEC50, Hill):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill))


def demo_data(params=None):
    rng = np.random.default_rng(51)
    n = params.get("n_std", 8)
    x = np.linspace(-2, 2, n)
    y = _pl4(x, 8, 100, 0.0, 1.0) + rng.normal(0, params.get("noise", 2.0), n)
    unk_true = 10 ** np.array([-0.8, 0.0, 0.9])
    unk_y = _pl4(np.log10(unk_true), 8, 100, 0.0, 1.0) + rng.normal(0, params.get("noise", 2.0), 3)
    return {"x": x.tolist(), "y": y.tolist(),
            "unk_y": unk_y.tolist(), "unk_true": unk_true.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    unk_y = np.asarray(data["unk_y"], dtype=float)
    unk_true = np.asarray(data.get("unk_true", [0.0] * len(unk_y)), dtype=float)
    fit_model = params.get("fit_model", "4pl")

    if fit_model == "4pl":
        model = Model(_pl4)
        p = model.make_params(Bottom=dict(value=y.min()), Top=dict(value=y.max()),
                              LogEC50=dict(value=np.median(x)), Hill=dict(value=1.0))
        result = model.fit(y, p, x=x)
        Top = result.params["Top"].value; Bot = result.params["Bottom"].value
        LogE = result.params["LogEC50"].value; Hill = result.params["Hill"].value
        with np.errstate(divide="ignore", invalid="ignore"):
            logx = LogE - np.log10(np.clip((Top - unk_y) / np.clip(unk_y - Bot, 1e-9, None), 1e-9, None)) / Hill
        conc = 10 ** logx
        r2 = float(result.rsquared)
    else:
        b, a = np.polyfit(x, y, 1)
        conc = (unk_y - a) / b
        logx = np.log10(conc)
        r2 = float(np.corrcoef(x, y)[0, 1] ** 2)

    # 外推标记：logx 是否超出标准曲线范围
    lo, hi = x.min(), x.max()
    samples = []
    for i, (ut, uy, c, lx) in enumerate(zip(unk_true, unk_y, conc, logx)):
        extrapolated = bool(lx < lo or lx > hi)
        err_pct = float((c - ut) / ut * 100) if ut > 0 else None
        samples.append({"sample": i + 1, "true_conc": float(ut), "measured_y": float(uy),
                        "predicted_conc": float(c), "error_pct": err_pct,
                        "extrapolated": extrapolated})
    return {
        "fit_model": fit_model, "r2": r2,
        "std_params": {pn: float(result.params[pn].value) for pn in result.var_names} if fit_model == "4pl" else {"a": float(a), "b": float(b)},
        "unknowns": samples,
        "n_extrapolated": sum(1 for s in samples if s["extrapolated"]),
        "interpretation": "反算浓度应落在标准曲线范围内；超出范围的结果不可靠，建议稀释重测。",
    }
