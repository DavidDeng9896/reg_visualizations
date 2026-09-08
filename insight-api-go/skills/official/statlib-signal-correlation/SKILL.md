# statlib 信号处理与相关

在 Custom Code 节点用 `statlib` 做「信号平滑/求导/积分」「曲线下面积 AUC」「两变量相关」「复孔行统计」。覆盖 5 个方法：

| 方法 | statlib.run 名 | 回答的问题 |
|---|---|---|
| 样条 / LOWESS 平滑 | `spline_lowess` | 用样条与 LOWESS 平滑曲线并对比哪个更优 |
| Savitzky-Golay 平滑·求导·积分 | `smooth_deriv_integrate` | 降噪 + 数值求导 + 累积积分 + 总 AUC + 信噪比 |
| 曲线下面积 AUC | `auc` | 梯形积分求 AUC（可对数 X、可扣基线） |
| 相关分析 | `correlation` | 两变量线性/单调相关（Pearson/Spearman/Kendall + CI） |
| 行统计（复孔聚合） | `row_statistics` | 复孔矩阵按行聚合均值/SD/SEM/CV，标 CV>15% 的不一致行 |

## 何时用本 skill

**意图词**：平滑 / 去噪 / 求导 / 积分 / 面积 / AUC / 药时曲线 / Cmax / 相关 / Pearson / Spearman / Kendall / 复孔 / 均值 / CV / 一致性。

**数据形状 → 方法**：
- (x,y) 序列、想平滑看趋势 → `spline_lowess`（连续平滑）或 `smooth_deriv_integrate`（含求导/积分）
- (x,y) 序列、要曲线下面积 → `auc`（仅 AUC）；若同时要平滑+求导+AUC → `smooth_deriv_integrate`
- 两列配对数值、要看相关性 → `correlation`
- 矩阵（行=样本，列=复孔）、要按行聚合 → `row_statistics`

**何时别用**：要组间差异检验 → `statlib-group-comparison`；要剂量反应拟合/IC50 → `statlib-dose-response-fitting`；分布/正态/离群 → `statlib-distribution-outlier`；ROC/方法一致性 → `statlib-classifier-agreement`。

## 调用契约（通用）

```python
import statlib
result = statlib.run(method, params, data)   # data 缺省用合成数据
# result = {"method","stats":{...,"interpretation":str},"params","data"}
```

**关键**：statlib 的 `data` 是 **dict**，不是 DataFrame。本组方法多数要 `{"x":[...],"y":[...]}`；复孔用 `{"mat":[[...],...]}`（2d）。

## 方法详解

### spline_lowess — 样条 / LOWESS 平滑

**数据 dict**：`{"x":[...], "y":[...]}`（x 单调递增最佳）。**params**：`k`（样条阶数，默认 3）；`smooth`（样条平滑因子，默认 3.0，越大越平滑）；`frac`（LOWESS 窗口占比，默认 0.25）。
**返回 stats**：`n, spline{rmse,k,s,fit_y[]}, lowess{frac,rmse,fit_y[]}, best(spline/lowess), interpretation`。`fit_y` 是 200 点平滑曲线，可直接画图。

### smooth_deriv_integrate — S-G 平滑 + 求导 + 积分

**数据 dict**：`{"x":[...], "y":[...]}`。**params**：`window`（奇数，默认 21）；`polyorder`（默认 3）。
**返回 stats**：`window, polyorder, smoothed[], derivative[], cumulative_integral[], total_auc, noise_before, noise_after, snr_gain, interpretation`。一次拿到平滑线、导数线、累积积分线、总 AUC。

### auc — 曲线下面积

**数据 dict**：`{"x":[...], "y":[...]}`。**params**：`baseline`（zero/first/last，默认 zero）；`logx`（true 时 X 取 log10 后积分，默认 false）。
**返回 stats**：`auc, baseline, baseline_mode, logx, n, interpretation`。

### correlation — 相关分析

**数据 dict**：`{"x":[...], "y":[...]}`。**params**：`method`（pearson/spearman/kendall，默认 pearson）。
**返回 stats**：`method, label(Pearson r/Spearman rho/Kendall tau), r, p_value, ci95, n, strength(strong/moderate/weak), interpretation`。
- Pearson：线性相关，要正态、连续。
- Spearman：单调相关，非参数、有离群/有序数据更稳。
- Kendall：单调（基于一致性对），小样本稳健。

### row_statistics — 复孔行统计

**数据 dict**：`{"mat": [[...],...]}`（2d：行=样本，列=复孔）。**params**：无必填。
**返回 stats**：`n_rows, n_reps, mean[], sd[], sem[], ci95[], cv_pct[], median[], cv_bad_rows[], interpretation`。`cv_bad_rows` 标 CV>15% 的行（复孔不一致警示）。

## 从 DataFrame 转

```python
# (x,y) 序列
df = inputs[0].data
data = {"x": df["time"].astype(float).tolist(), "y": df["conc"].astype(float).tolist()}
# 复孔矩阵：表里每行一个样本，多个复孔列 rep1,rep2,rep3
import numpy as np
mat = df[["rep1","rep2","rep3"]].astype(float).values.tolist()
data = {"mat": mat}
```

## Custom Code 模板（IOData 返回）

复孔行统计示例：返回聚合表 + 复孔 CV 警示图。

```python
import numpy as np
import pandas as pd
import plotly.graph_objects as go

def custom_code(inputs, **kwargs):
    import statlib
    df = inputs[0].data
    mat = df[["rep1","rep2","rep3"]].astype(float).values.tolist()
    r = statlib.run("row_statistics", {}, {"mat": mat})
    s = r["stats"]
    # 1) 聚合表
    agg = pd.DataFrame({
        "row": range(s["n_rows"]),
        "mean": s["mean"], "sd": s["sd"], "sem": s["sem"],
        "cv_pct": [round(c,1) for c in s["cv_pct"]],
        "cv_bad": [i in s["cv_bad_rows"] for i in range(s["n_rows"])],
    })
    # 2) CV 柱图（标红 CV>15%）
    fig = go.Figure()
    fig.add_trace(go.Bar(x=agg["row"], y=agg["cv_pct"],
        marker_color=["red" if b else "steelblue" for b in agg["cv_bad"]], name="CV%"))
    fig.add_hline(y=15, line_dash="dash", line_color="red", annotation_text="CV 15% 阈值")
    fig.update_layout(title=s["interpretation"], xaxis_title="行", yaxis_title="CV%")
    return [
        IOData(name="row_stats", data=agg),
        IOData(name="cv_bar", data=fig),
    ]
```

AUC + 平滑曲线示例（药时曲线）：

```python
def custom_code(inputs, **kwargs):
    import statlib, numpy as np
    df = inputs[0].data
    data = {"x": df["time"].tolist(), "y": df["conc"].astype(float).tolist()}
    r = statlib.run("auc", {"baseline":"zero"}, data)
    s = r["stats"]
    import pandas as pd, plotly.graph_objects as go
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=data["x"], y=data["y"], mode="lines", name="浓度"))
    fig.update_layout(title=s["interpretation"], xaxis_title="时间", yaxis_title="浓度")
    return [
        IOData(name="auc", data=pd.DataFrame([{"auc":s["auc"],"baseline":s["baseline"],"interpretation":s["interpretation"]}])),
        IOData(name="conc_curve", data=fig),
    ]
```

> `IOData` 已被 worker 注入。DataFrame→表节点；`go.Figure`→只读 Python 图节点（chartId=`stepId::name`）。

## 取舍边界（与原生步骤）

- 只要散点/折线看趋势 → `create_view` + `set_chart_config`（scatter/line），**不必**开 custom code。
- 需要 **平滑后曲线+RMSE 对比 / 求导 / 积分 / AUC 数值 / 相关系数+CI+显著性 / 复孔 CV 警示** 这类定量结论时才用本 skill。
- AUC：仅要面积用 `auc`（轻量）；要平滑+求导+积分一起拿用 `smooth_deriv_integrate`。
- 相关 ≠ 因果——interpretation 已提示，别在总结里下因果结论。
- 写完代码后调 `run_python_code` 验证，报错就修，不让用户试错。

## 参数启发式（按意图设默认）

- 平滑、信号噪声大 → `smooth_deriv_integrate` 默认 window=21/polyorder=3；采样稀疏时调小 window。
- 曲线抖、想要连续平滑线 → `spline_lowess`；样条过拟合调大 `smooth`，LOWESS 调大 `frac`。
- 药时曲线 AUC → `auc`；末端有基线漂移 → `baseline=last`；浓度-时间对数刻度 → `logx=true`。
- 相关、近似正态连续 → `method=pearson`；有离群/有序/非线性单调 → `method=spearman`；小样本稳健 → `method=kendall`。
- 复孔：默认无参数即可；CV 阈值固定 15%，`cv_bad_rows` 自动标出，无需设参。
