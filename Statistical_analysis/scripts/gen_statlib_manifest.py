"""生成 statlib_manifest.json —— 产品整合清单（方法/参数/依赖/对应skill/调用示例）。

用法: .venv/Scripts/python.exe scripts/gen_statlib_manifest.py
"""
import json
import os
import sys

# 确保可从项目根 import statlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 每个方法的参数 schema：key -> (默认值, 说明)。数据相关参数标 prefix "data:"
METHOD_META = {
    "nonlinear_regression": {
        "params": {
            "model": ("four_pl", "模型: four_pl/three_pl/five_pl/mm/exp_decay"),
            "weighting": ("equal", "权重: equal/1/y/1/y2/y/y2"),
            "robust": (False, "稳健回归 soft_l1"),
            "compare": (False, "是否输出 AICc 模型比较表"),
            "data:n_points": (9, "浓度点数"), "data:reps": (3, "复孔数"),
        },
        "deps": ["lmfit", "scipy", "statsmodels"],
    },
    "linear_regression": {
        "params": {"force_zero": (False, "强制过原点"), "data:n": (20, "样本量"),
                   "data:slope": (1.2, "真实斜率"), "data:noise": (1.5, "噪声SD")},
        "deps": ["statsmodels", "numpy"],
    },
    "logistic_regression": {
        "params": {"five_pl": (False, "是否用5PL"), "data:n_points": (9, "浓度点数"),
                   "data:reps": (4, "复孔数")},
        "deps": ["lmfit", "numpy"],
    },
    "spline_lowess": {
        "params": {"k": (3, "样条阶数"), "smooth": (3.0, "样条平滑度"),
                   "frac": (0.25, "LOWESS窗口比例"), "data:n": (40, "点数"),
                   "data:shape": ("sin", "数据形状")},
        "deps": ["scipy", "statsmodels"],
    },
    "smooth_deriv_integrate": {
        "params": {"window": (21, "S-G窗口(奇数)"), "polyorder": (3, "多项式阶"),
                   "data:n": (200, "采样点数"), "data:shape": ("peaks", "信号形状")},
        "deps": ["scipy"],
    },
    "auc": {
        "params": {"baseline": ("zero", "基线: zero/first/last"), "logx": (False, "X对数化"),
                   "data:n": (20, "点数"), "data:shape": ("pk", "曲线类型")},
        "deps": ["scipy"],
    },
    "deming_regression": {
        "params": {"lambda_source": ("true", "λ来源: true(数据)/manual"),
                   "lam_manual": (1.0, "手动λ"), "data:n": (25, "样本量")},
        "deps": ["numpy", "scipy"],
    },
    "row_statistics": {
        "params": {"data:n_rows": (12, "行数"), "data:n_reps": (3, "复孔数"),
                   "data:trend": (0.8, "行间趋势"), "data:noise": (0.8, "噪声SD")},
        "deps": ["numpy"],
    },
    "correlation": {
        "params": {"method": ("pearson", "方法: pearson/spearman/kendall"),
                   "data:n": (60, "样本量"), "data:rho": (0.7, "真实相关"),
                   "data:monotone": (False, "单调非线性")},
        "deps": ["scipy"],
    },
    "standard_curve_interpolation": {
        "params": {"fit_model": ("4pl", "标准曲线模型: 4pl/linear"),
                   "data:n_std": (8, "标准品点数"), "data:noise": (2.0, "噪声SD")},
        "deps": ["lmfit", "numpy"],
    },
    "t_test": {
        "params": {"design": ("unpaired", "设计: unpaired/paired/onesample"),
                   "gauss": ("auto", "正态假设: auto/yes/no"),
                   "equal_var": ("welch", "非配对方差: welch/equal"),
                   "tail": (2, "尾: 2双尾/1单尾"),
                   "data:n": (12, "每组样本量"), "data:mu_ctrl": (20, "对照均值"),
                   "data:mu_trt": (28, "处理均值"), "data:sd": (5, "SD")},
        "deps": ["scipy"],
    },
    "anova": {
        "params": {"approach": ("auto", "路径: auto/param/nonparam"),
                   "posthoc": ("tukey", "事后: tukey/dunnett/bonf"),
                   "data:k": (4, "组数"), "data:n": (8, "每组样本量"),
                   "data:effect": (4.0, "组间效应"), "data:hetero": (False, "方差不齐")},
        "deps": ["scipy", "statsmodels", "pingouin", "scikit-posthocs", "pandas"],
    },
    "one_sample_test": {
        "params": {"approach": ("auto", "auto/t/w"), "data:n": (18, "样本量"),
                   "data:mu_true": (12, "真实均值"), "data:mu0": (10, "理论值"),
                   "data:skewed": (False, "偏态数据")},
        "deps": ["scipy"],
    },
    "descriptive_statistics": {
        "params": {"data:n": (80, "样本量"), "data:sd": (3.0, "SD"),
                   "data:shape": ("normal", "分布: normal/lognorm/bimodal/uniform")},
        "deps": ["numpy", "scipy"],
    },
    "normality_test": {
        "params": {"shapiro": (True, "启用Shapiro"), "dagostino": (True, "启用D'Agostino"),
                   "ks": (True, "启用KS"), "test_lognorm": (False, "对数正态检验"),
                   "data:n": (40, "样本量"), "data:dist": ("normal", "真实分布")},
        "deps": ["scipy"],
    },
    "frequency_distribution": {
        "params": {"bin_method": ("sqrt", "分箱: sqrt/rice/manual"),
                   "n_bins": (15, "手动箱数"), "data:n": (120, "样本量"),
                   "data:shape": ("normal", "分布形状")},
        "deps": ["numpy"],
    },
    "roc_curve": {
        "params": {"data:n_case": (60, "病例数"), "data:n_ctrl": (60, "对照数"),
                   "data:dprime": (1.5, "分离度")},
        "deps": ["scikit-learn", "numpy"],
    },
    "bland_altman": {
        "params": {"data:n": (50, "样本数"), "data:bias": (1.2, "系统偏倚"),
                   "data:ratio": (1.05, "比例因子"), "data:noise": (1.5, "随机误差SD")},
        "deps": ["scipy"],
    },
    "outlier_detection": {
        "params": {"method": ("grubbs", "方法: iqr/grubbs/rout"), "alpha": (0.05, "α/Q值"),
                   "data:n": (30, "样本量"), "data:n_out": (2, "注入离群点数")},
        "deps": ["scipy", "statsmodels"],
    },
    "p_value_stack": {
        "params": {"test": ("t", "检验: t/mw"), "correction": ("fdr_bh", "校正: fdr_bh/holm/bonferroni/none"),
                   "fdr": (0.05, "显著阈值"), "data:n_genes": (100, "基因数"),
                   "data:n": (8, "每组样本量"), "data:prop_de": (0.15, "真差异比例"),
                   "data:effect": (2.2, "效应量")},
        "deps": ["scipy", "statsmodels"],
    },
}

SKILL_MAP = {
    "nonlinear_regression": "stat-nonlinear-regression",
    "linear_regression": "stat-linear-regression",
    "logistic_regression": "stat-logistic-regression",
    "spline_lowess": "stat-spline-lowess",
    "smooth_deriv_integrate": "stat-smooth-deriv-integrate",
    "auc": "stat-auc",
    "deming_regression": "stat-deming-regression",
    "row_statistics": "stat-row-statistics",
    "correlation": "stat-correlation",
    "standard_curve_interpolation": "stat-standard-curve-interpolation",
    "t_test": "stat-t-test",
    "anova": "stat-anova",
    "one_sample_test": "stat-one-sample-test",
    "descriptive_statistics": "stat-descriptive-statistics",
    "normality_test": "stat-normality-test",
    "frequency_distribution": "stat-frequency-distribution",
    "roc_curve": "stat-roc-curve",
    "bland_altman": "stat-bland-altman",
    "outlier_detection": "stat-outlier-detection",
    "p_value_stack": "stat-p-value-stack",
}


def build():
    import statlib
    methods = []
    for method, mod in statlib.METHODS.items():
        meta = METHOD_META[method]
        params = {k: {"default": v[0], "description": v[1],
                      "regenerates_data": k.startswith("data:")}
                  for k, v in meta["params"].items()}
        methods.append({
            "method": method,
            "module": f"statlib.{mod}",
            "doc": statlib.METHOD_DOCS[method],
            "skill": SKILL_MAP[method],
            "dependencies": meta["deps"],
            "params": params,
            "reference_page": f"pages/{mod}.py",
            "call_example": f'import statlib; result = statlib.run("{method}", params, data)',
        })
    manifest = {
        "name": "statlib",
        "version": statlib.__version__,
        "description": "AI 统计分析算法库：20 个方法，纯计算、JSON 可序列化、固定种子可复现",
        "integration": {
            "entry": "import statlib; result = statlib.run(method, params, data)",
            "result_schema": '{"method", "stats": {..., "interpretation": str}, "params", "data"}',
            "available_methods": "statlib.available()",
        },
        "methods": methods,
    }
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "statlib_manifest.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"已生成 {out}（{len(methods)} 个方法）")


if __name__ == "__main__":
    build()
