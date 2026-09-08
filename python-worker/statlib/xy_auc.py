"""曲线下面积 AUC（梯形法则 + 基线扣除，纯计算版）。"""
import numpy as np
from scipy.integrate import trapezoid

METHOD = "auc"


def demo_data(params=None):
    rng = np.random.default_rng(11)
    n = params.get("n", 20)
    kind = params.get("shape", "pk")
    t = np.linspace(0.1, 24, n)
    if kind == "peak":
        c = 10 * np.exp(-0.5 * ((t - 9) / 1.6) ** 2) + 0.5
    else:
        c = 80 * np.exp(-0.18 * t) + 5
    y = np.clip(c + rng.normal(0, params.get("noise", 0.05) * c.max() * 0.5, n), 0, None)
    return {"x": t.tolist(), "y": y.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    logx = bool(params.get("logx", False))
    base_mode = params.get("baseline", "zero")

    if base_mode == "zero":
        base = 0.0
    elif base_mode == "first":
        base = y[0]
    else:
        base = y[-1]
    xa = np.log10(x) if logx else x
    total = float(trapezoid(y - base, xa))
    return {
        "auc": total, "baseline": base, "baseline_mode": base_mode,
        "logx": logx, "n": int(len(x)),
        "interpretation": f"AUC = {total:.4g}（基线 Y={base:.3g}，{'X 对数化' if logx else '线性 X'} 梯形积分）",
    }
