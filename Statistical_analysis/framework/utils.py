"""通用工具：数值格式化、JSON 序列化辅助。"""
import numpy as np


def to_plain(obj):
    """把 numpy 类型/数组递归转成纯 Python 类型（可 JSON 序列化）。"""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.generic):
        return obj.item()
    if isinstance(obj, dict):
        return {k: to_plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_plain(v) for v in obj]
    return obj


def fmt(x, nd=4):
    """通用数值格式化，None/NaN 显示为 —。"""
    if x is None:
        return "—"
    try:
        if np.isnan(x):
            return "—"
    except (TypeError, ValueError):
        pass
    return f"{x:.{nd}g}"


def fmt_p(p):
    """P 值格式化。"""
    if p is None or (isinstance(p, float) and np.isnan(p)):
        return "—"
    if p < 0.0001:
        return "P < 0.0001"
    return f"P = {p:.4f}"


def ci_text(lo, hi, nd=3):
    return f"[{lo:.{nd}g}, {hi:.{nd}g}]"
