"""行统计：复孔数据按行聚合均值/SD/SEM/CV（纯计算版）。"""
import numpy as np

METHOD = "row_statistics"


def demo_data(params=None):
    rng = np.random.default_rng(31)
    n, r = params.get("n_rows", 12), params.get("n_reps", 3)
    row_base = 5 + params.get("trend", 0.8) * np.arange(n) + rng.normal(0, 1.0, n)
    mat = row_base[:, None] + rng.normal(0, params.get("noise", 0.8), (n, r))
    return {"mat": mat.tolist()}


def analyze(data, params=None):
    mat = np.asarray(data["mat"], dtype=float)
    n, r = mat.shape
    mean = mat.mean(axis=1)
    sd = mat.std(axis=1, ddof=1)
    sem = sd / np.sqrt(r)
    return {
        "n_rows": int(n), "n_reps": int(r),
        "mean": mean.tolist(), "sd": sd.tolist(), "sem": sem.tolist(),
        "ci95": (sem * 1.96).tolist(),
        "cv_pct": (sd / np.abs(mean) * 100).tolist(),
        "median": np.median(mat, axis=1).tolist(),
        "cv_bad_rows": [int(i) for i, c in enumerate(sd / np.abs(mean) * 100) if c > 15],
        "interpretation": f"{n} 行 × {r} 复孔已聚合；CV>15% 的行 {sum(sd / np.abs(mean) * 100 > 15)} 个（提示复孔不一致）。",
    }
