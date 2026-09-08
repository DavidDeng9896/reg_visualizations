# statlib 分布形态与离群诊断

在 Custom Code 节点用 `statlib` 做「分布描述 / 正态性判断 / 频数分布 / 离群点检测」。覆盖 4 个方法：

| 方法 | statlib.run 名 | 回答的问题 |
|---|---|---|
| 描述统计 | `descriptive_statistics` | 均值/中位/SD/SEM/CI/分位数/偏度峰度，判断是否偏态 |
| 正态性检验 | `normality_test` | 数据是否服从正态（Shapiro/D'Agostino/KS，可查对数正态） |
| 频数分布 | `frequency_distribution` | 直方分箱 + 频数表 + 累积，看双峰/偏态/异常聚集 |
| 离群点检测 | `outlier_detection` | IQR/Grubbs/ROUT 找异常点 |

> **这组方法通常是为后续假设检验做「预检」**（正态→参数检验，不正态→非参数；有离群→先处理）。statlib 的 t_test/anova 已内置 Shapiro 预检，多数情况下无需单独跑正态性；只有需要显式分布报告或独立离群清洗时才单独用本 skill。

## 何时用本 skill

**意图词**：描述统计 / 均值 / 标准差 / 中位数 / 正态 / 正态性 / 偏态 / 分布 / 直方图 / 频数 / 双峰 / 离群点 / 异常值 / 剔除离群。

**数据形状 → 方法**（均为单列数值 `{"x":[...]}`）：
- 想要一组数据的关键统计量 + 偏态判断 → `descriptive_statistics`
- 要判断能否用参数检验（是否正态）→ `normality_test`
- 想看分布形态（直方/双峰/聚集）→ `frequency_distribution`
- 怀疑有异常值要标出 → `outlier_detection`

**何时别用**：要组间差异检验 → `statlib-group-comparison`；要曲线拟合 → `statlib-dose-response-fitting`；ROC/一致性 → `statlib-classifier-agreement`；信号平滑/积分/相关 → `statlib-signal-correlation`。

## 调用契约（通用）

```python
import statlib
result = statlib.run(method, params, data)   # data 缺省用合成数据
# result = {"method","stats":{...,"interpretation":str},"params","data"}
```

**关键**：statlib 的 `data` 是 **dict**，不是 DataFrame。本组方法都只要 `{"x":[...]}`（单列数值）。转换：
```python
df = inputs[0].data
data = {"x": df["value"].astype(float).tolist()}
```

## 方法详解

### descriptive_statistics — 描述统计

**数据 dict**：`{"x":[...]}`。**params**：无必填（demo 支持 `n/sd/shape` 仅用于合成数据，真实数据不读）。
**返回 stats**：`n, mean, median, sd, sem, ci95, q1, q3, iqr, min, max, skewness, kurtosis, shape(approx-symmetric/right-skew/left-skew), interpretation`。`shape` 按偏度绝对值>0.5 判偏态。

### normality_test — 正态性检验

**数据 dict**：`{"x":[...]}`。**params**：
| 参数 | 默认 | 含义 |
|---|---|---|
| `shapiro` | true | Shapiro-Wilk（n≥3，小样本首选，n<20 功效低） |
| `dagostino` | true | D'Agostino-Pearson（n≥20 才跑） |
| `ks` | true | Kolmogorov-Smirnov |
| `test_lognorm` | false | true 额外对 log(x>0) 做 Shapiro，查对数正态 |

**返回 stats**：`n, tests[{test,statistic,p_value,normal}], verdict(normal / reject_normal(k/n)), interpretation`。

### frequency_distribution — 频数分布

**数据 dict**：`{"x":[...]}`。**params**：`bin_method`（sqrt/rice/manual；默认 sqrt）；`n_bins`（manual 时生效，默认 15）。
**返回 stats**：`n, n_bins, bins[{low,high,count,pct,cum_pct}], interpretation`。

### outlier_detection — 离群点检测

**数据 dict**：`{"x":[...]}`。**params**：
| 参数 | 默认 | 取值 / 含义 |
|---|---|---|
| `method` | grubbs | iqr / grubbs / rout |
| `alpha` | 0.05 | grubbs 的 α；rout 的 FDR Q（iqr 不用） |

**返回 stats**：`method, description, outlier_indices[], outlier_values[], n_outliers, n, mean, sd, interpretation`。

- `iqr`：Q1−1.5·IQR ~ Q3+1.5·IQR 之外为离群（非参数、稳健、不假设分布）。
- `grubbs`：迭代极值检验，适合近正态、零星离群。
- `rout`：基于稳健 Z + FDR 校正（Motulsky ROUT），适合多离群、不假设正态。

## Custom Code 模板（IOData 返回）

离群检测示例：返回离群点表 + 标注散点图。

```python
import numpy as np
import pandas as pd
import plotly.graph_objects as go

def custom_code(inputs, **kwargs):
    import statlib
    df = inputs[0].data
    data = {"x": df["value"].astype(float).tolist()}
    r = statlib.run("outlier_detection", {"method":"rout","alpha":0.05}, data)
    s = r["stats"]
    # 1) 离群点表
    out_df = pd.DataFrame([{"index":i,"value":v} for i,v in zip(s["outlier_indices"],s["outlier_values"])])
    out_df["method"] = s["method"]
    # 2) 标注散点图
    x = np.array(data["x"])
    is_out = np.zeros(len(x), dtype=bool)
    is_out[s["outlier_indices"]] = True
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=np.where(~is_out)[0], y=x[~is_out], mode="markers", name="正常"))
    fig.add_trace(go.Scatter(x=np.where(is_out)[0], y=x[is_out], mode="markers",
                             marker=dict(color="red",size=12), name="离群"))
    fig.update_layout(title=s["interpretation"], xaxis_title="序号", yaxis_title="值")
    return [
        IOData(name="outliers", data=out_df),
        IOData(name="outlier_scatter", data=fig),
    ]
```

> `IOData` 已被 worker 注入。DataFrame→表节点；`go.Figure`→只读 Python 图节点（chartId=`stepId::name`）。

## 取舍边界（与原生步骤）

- 只要直方图/箱线图看分布 → `create_view` + `set_chart_config`（histogram/box），**不必**开 custom code。
- 需要 **偏度/峰度/正态性 P 值/离群点索引+标注** 这类定量结论时才用本 skill。
- 正态性预检：statlib 的 t_test/anova 已内置 Shapiro 自动决策，多数情况别再单独跑 normality_test；只有要给用户一份独立正态性报告时才单独做。
- 离群点剔除前应核查原始记录——统计学证据不能替代实验判断（interpretation 已提示）。
- 写完代码后调 `run_python_code` 验证，报错就修，不让用户试错。

## 参数启发式（按意图设默认）

- 不确定方法 → `outlier_detection` 默认 `grubbs`（近正态零星离群）。
- 不想假设正态 / 明显偏态 → `method=iqr`（非参稳健）或 `method=rout`（多离群 + FDR）。
- 想更宽松地标离群 → `alpha=0.01`（更严，少标）或 `alpha=0.1`（更松）；默认 0.05。
- 正态性、小样本 → `shapiro=true`，关掉 `dagostino`（n<20 跑不了）；大样本加 `ks=true`。
- 怀疑对数正态 → `test_lognorm=true`。
- 频数分布、不确定箱数 → `bin_method=sqrt`（默认）；样本大用 `rice`；想固定 → `manual, n_bins=20`。
