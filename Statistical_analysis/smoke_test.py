"""全量冒烟测试：验证 20 个分析页面的数据生成 + 分析 + 绘图可跑通且可 JSON 序列化。

用法: .venv/Scripts/python.exe smoke_test.py
"""
import json
import traceback

import numpy as np
import dash

# Dash Pages 要求先实例化 app（use_pages=True）再 register_page
_app = dash.Dash(__name__, use_pages=True, suppress_callback_exceptions=True)

import pages  # noqa: F401  导入全部页面模块（触发 register_page）

MODULES = [
    "xy_nonlinear", "xy_linear", "xy_logistic", "xy_spline", "xy_smooth",
    "xy_auc", "xy_deming", "xy_rowstats", "xy_correlation", "xy_interpolate",
    "col_ttests", "col_anova", "col_onesample", "col_descriptive", "col_normality",
    "col_frequency", "col_roc", "col_blandaltman", "col_outliers", "col_stackpvals",
]

# 额外参数组合：覆盖容易出错的代码分支
EXTRA_CASES = {
    "xy_nonlinear": [
        {"data_model": "mm", "fit_model": "auto"},
        {"data_model": "exp_decay", "fit_model": "auto", "inject_outlier": True, "rout": True},
        {"data_model": "four_pl", "fit_model": "three_pl", "compare_models": True,
         "show_residuals": True, "weighting": "1/y2", "robust": True},
        {"data_model": "four_pl", "fit_model": "five_pl", "hill_constraint": "fixed1"},
    ],
    "col_anova": [
        {"approach": "param", "posthoc": "dunnett"},
        {"approach": "param", "posthoc": "bonf", "hetero": True},
        {"approach": "nonparam"},
        {"k": 3, "effect": 0},
    ],
    "col_ttests": [
        {"design": "paired"}, {"design": "onesample"},
        {"design": "unpaired", "gauss": "no"}, {"design": "unpaired", "gauss": "yes", "tail": 1},
    ],
    "col_roc": [{"show_dist": False, "dprime": 0.5}],
    "col_stackpvals": [{"test": "mw", "correction": "bonferroni"}, {"prop_de": 0}],
    "col_outliers": [{"method": "iqr"}, {"method": "rout", "n_out": 3}],
    "xy_linear": [{"show_residuals": True, "show_zero": True}],
    "col_blandaltman": [{"ratio": 1.0, "bias": 0}],
    "col_normality": [{"dist": "exp", "test_lognorm": True}],
    "col_frequency": [{"bin_method": "manual", "n_bins": 12}],
}


def default_params(controls):
    params = {}
    for spec in controls:
        if spec["type"] == "group":
            continue
        params[spec["id"]] = spec.get("value")
    return params


def check_module(name):
    m = __import__(f"pages.{name}", fromlist=["*"])
    fails = []
    base = default_params(m.CONTROLS)
    cases = [base] + [{**base, **extra} for extra in EXTRA_CASES.get(name, [])]
    for i, p in enumerate(cases):
        try:
            data = m.generate_data(p)
            fig, stats = m.analyze(data, p)
            json.dumps(fig.to_plotly_json())
            assert isinstance(stats, dict) or stats is not None
        except Exception as e:
            fails.append((i, p, repr(e), traceback.format_exc()))
    return fails, len(cases)


def main():
    total = 0
    all_fails = []
    for name in MODULES:
        fails, n = check_module(name)
        total += n
        if fails:
            for i, p, err, tb in fails:
                all_fails.append((name, i, p, err))
                print(f"FAIL {name} case#{i}: {err}")
                print(tb)
        else:
            print(f"OK   {name} ({n} cases)")
    print("-" * 50)
    print(f"总计 {len(MODULES)} 个页面 / {total} 个用例")
    if all_fails:
        print(f"❌ {len(all_fails)} 个用例失败")
        return 1
    print("✅ 全部通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
