"""statlib —— AI 统计分析算法库（独立于 Prism Lab UI 框架，可被任何产品直接 import）。

每个方法 = 一个模块，统一暴露两个接口：
  analyze(data: dict, params: dict) -> dict   # 纯计算，返回 JSON 可序列化结果
  demo_data(params: dict) -> dict             # 合成演示数据（固定随机种子，可复现）

统一入口 run()：产品端一行调用
  import statlib
  result = statlib.run("t_test", params, data)     # data 缺省时用合成数据
  result = statlib.run("nonlinear_regression", params)

结果 dict 固定为 {"method": ..., "stats": {...}, "params": {...}, "data": {...}}
其中 stats 含全部统计量（可 JSON 序列化），data 含输入数据（回传给产品用于绘图）。
"""
import importlib

__version__ = "1.0.0"

# 方法名 → 模块名 注册表（产品整合用；与 pages/ 下 20 个分析一一对应）
METHODS = {
    "nonlinear_regression": "xy_nonlinear",
    "linear_regression": "xy_linear",
    "logistic_regression": "xy_logistic",
    "spline_lowess": "xy_spline",
    "smooth_deriv_integrate": "xy_smooth",
    "auc": "xy_auc",
    "deming_regression": "xy_deming",
    "row_statistics": "xy_rowstats",
    "correlation": "xy_correlation",
    "standard_curve_interpolation": "xy_interpolate",
    "t_test": "col_ttests",
    "anova": "col_anova",
    "one_sample_test": "col_onesample",
    "descriptive_statistics": "col_descriptive",
    "normality_test": "col_normality",
    "frequency_distribution": "col_frequency",
    "roc_curve": "col_roc",
    "bland_altman": "col_blandaltman",
    "outlier_detection": "col_outliers",
    "p_value_stack": "col_stackpvals",
}

METHOD_DOCS = {
    "nonlinear_regression": "曲线拟合（4PL/5PL/MM/指数衰减），提取 IC50/Vmax/Km",
    "linear_regression": "简单线性回归 Y=a+bX",
    "logistic_regression": "S 形剂量-反应 4PL/5PL + 二分类概率",
    "spline_lowess": "样条/LOWESS 平滑拟合",
    "smooth_deriv_integrate": "Savitzky-Golay 平滑/求导/积分",
    "auc": "曲线下面积（梯形法则+基线扣除）",
    "deming_regression": "Deming 回归（X/Y 均有误差）",
    "row_statistics": "行统计（复孔均值/SD/SEM/CV）",
    "correlation": "相关分析 Pearson/Spearman/Kendall",
    "standard_curve_interpolation": "标准曲线反算浓度",
    "t_test": "t 检验（含 Shapiro 预检决策）",
    "anova": "单因素 ANOVA + 事后检验",
    "one_sample_test": "单样本检验 vs 理论值",
    "descriptive_statistics": "描述统计",
    "normality_test": "正态性检验",
    "frequency_distribution": "频数分布",
    "roc_curve": "ROC 曲线 + Youden 阈值",
    "bland_altman": "Bland-Altman 一致性",
    "outlier_detection": "离群点检测 IQR/Grubbs/ROUT",
    "p_value_stack": "P 值堆栈 + 多重比较校正",
}


def available():
    """返回所有可用方法及简介（产品整合用）。"""
    return [{"method": k, "module": v, "doc": METHOD_DOCS[k]} for k, v in METHODS.items()]


def run(method, params=None, data=None):
    """统一入口：执行指定统计方法。

    参数:
      method  方法名（见 METHODS 键）
      params  参数字典（缺省时用各方法默认参数）
      data    输入数据 dict（缺省时用合成演示数据）
    返回:
      {"method", "stats", "params", "data"}  —— 全部可 JSON 序列化
    """
    if method not in METHODS:
        raise KeyError(f"未知方法 '{method}'，可用: {list(METHODS)}")
    mod = importlib.import_module(f"statlib.{METHODS[method]}")
    params = params or {}
    if data is None:
        data = mod.demo_data(params)
    stats = mod.analyze(data, params)
    return {"method": method, "stats": stats, "params": params, "data": data}
