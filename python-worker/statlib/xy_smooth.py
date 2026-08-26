"""Savitzky-Golay 平滑 / 数值求导 / 梯形积分（纯计算版）。"""
import numpy as np
from scipy.signal import savgol_filter
from scipy.integrate import cumulative_trapezoid, trapezoid

METHOD = "smooth_deriv_integrate"


def _signal(x, name):
    if name == "peaks":
        return (np.exp(-0.5 * ((x - 6) / 0.7) ** 2) + 1.4 * np.exp(-0.5 * ((x - 10.5) / 0.8) ** 2))
    return np.exp(-0.4 * x) + 0.1


def demo_data(params=None):
    rng = np.random.default_rng(3)
    n = params.get("n", 200)
    kind = params.get("shape", "peaks")
    x = np.linspace(0, 14, n)
    y = _signal(x, kind) + rng.normal(0, params.get("noise", 0.08), n)
    return {"x": x.tolist(), "y": y.tolist()}


def analyze(data, params=None):
    params = params or {}
    x = np.asarray(data["x"], dtype=float)
    y = np.asarray(data["y"], dtype=float)
    w = int(params.get("window", 21))
    if w % 2 == 0:
        w += 1
    w = min(w, len(x) if len(x) % 2 == 1 else len(x) - 1)
    poly = int(params.get("polyorder", 3))
    ys = savgol_filter(y, w, poly, mode="interp")

    truth = _signal(x, params.get("shape", "peaks"))
    noise_before = float(np.std(y - truth))
    noise_after = float(np.std(ys - truth))

    return {
        "window": w, "polyorder": poly,
        "smoothed": ys.tolist(),
        "derivative": np.gradient(ys, x).tolist(),
        "cumulative_integral": np.concatenate([[0], cumulative_trapezoid(ys, x)]).tolist(),
        "total_auc": float(trapezoid(ys, x)),
        "noise_before": noise_before, "noise_after": noise_after,
        "snr_gain": float(noise_before / noise_after) if noise_after > 0 else float("inf"),
        "interpretation": f"S-G(窗口{w},阶{poly}) 平滑后噪声 {noise_before:.3g}→{noise_after:.3g}"
                          f"（信噪比提升 {noise_before / max(noise_after, 1e-12):.1f}×）。",
    }
