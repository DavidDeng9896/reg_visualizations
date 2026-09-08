# statlib 剂量反应与曲线拟合

在 Custom Code 节点用 `statlib` 做「曲线拟合 / 剂量反应 / 标准曲线反算」。覆盖 5 个方法：

| 方法 | statlib.run 名 | 回答的问题 |
|---|---|---|
| 非线性回归（4PL/3PL/5PL/MM/指数衰减） | `nonlinear_regression` | 拟合 S 形/米氏/衰减曲线，提 IC50/Vmax/Km/半衰期 + R² + 模型比较 |
| 简单线性回归 Y=a+bX | `linear_regression` | Y 是否随 X 线性变化，斜率及其 CI、显著性 |
| 逻辑回归（4PL/5PL 二分类概率） | `logistic_regression` | S 形剂量反应 + 二分类响应概率 + 分类准确率 |
| Deming 回归（X/Y 均有误差） | `deming_regression` | 两仪器/方法对比，X 也有误差时的回归斜率 |
| 标准曲线插值（反算浓度） | `standard_curve_interpolation` | 用标准品建曲线，反算未知样本浓度 + 外推标记 |

## 何时用本 skill

**意图词**：拟合 / 曲线 / IC50 / EC50 / 剂量反应 / 4PL / 5PL / Hill / Vmax / Km / 半衰期 / 标准曲线 / 反算浓度 / ELISA / 线性回归 / 斜率 / Deming / 方法对比。

**数据形状 → 方法**：
- X=浓度(或 log10 浓度)，Y=响应，多复孔 → `nonlinear_regression`
  - S 形抑制/激活（生化测定）→ `model=four_pl`（默认）；不对称 S 形 → `five_pl`；已知单位点强制 → `three_pl`
  - 酶动力学（速率 vs 底物浓度）→ `model=mm`（米氏，提 Vmax/Km）
  - 衰减信号 → `model=exp_decay`（提半衰期）
- X、Y 线性关系，要看斜率/P 值 → `linear_regression`
- S 形 + 二分类响应(0/1) 列 → `logistic_regression`
- X/Y 都有测量误差（两台仪器/两种方法比对）→ `deming_regression`
- 标准品(X,Y) + 未知样本(Y) → `standard_curve_interpolation`

**何时别用**：要假设检验/组间差异 → `statlib-group-comparison`；分布/正态/离群 → `statlib-distribution-outlier`；ROC/一致性 → `statlib-classifier-agreement`；纯平滑/积分/相关 → `statlib-signal-correlation`。

## 调用契约（通用）

```python
import statlib
result = statlib.run(method, params, data)   # data 缺省用合成数据
# result = {"method","stats":{...,"interpretation":str},"params","data"}
```

**关键**：statlib 的 `data` 是 **dict**，不是 DataFrame。这些方法的 X 通常是 **log10 浓度**（4PL 系列按 Prism 习惯）。把上游 DataFrame 的两列转成 `{"x":[...],"y":[...]}`。

## 方法详解

### nonlinear_regression — 4PL/3PL/5PL/MM/指数衰减

**数据 dict**：`{"x":[...], "y":[...]}`（x=浓度 log10，y=响应；可含多复孔，x/y 等长即可）。

**params**：
| 参数 | 默认 | 取值 / 含义 |
|---|---|---|
| `model` | four_pl | four_pl/three_pl/five_pl/mm/exp_decay |
| `weighting` | equal | equal/1/y/1/y2/y/y2（低浓度方差大时用 1/y2） |
| `robust` | false | true 用 soft_l1 稳健回归，抗离群 |
| `compare` | false | true 输出 AICc 模型比较表（选最适模型） |

**返回 stats**：`model, n, k, params[{param,value,se,ci95}], derived{ic50,ic50_ci95 或 half_life}, r2, aicc, bic, redchi, model_comparison[{model,aicc,r2,delta_aicc}], interpretation`。

**从 DataFrame 转**：
```python
df = inputs[0].data   # 列如 conc_log, response；或 conc(原始) 需先 np.log10
import numpy as np
data = {"x": np.log10(df["conc"]).tolist(), "y": df["response"].astype(float).tolist()}
```

### linear_regression — Y = a + bX

**数据 dict**：`{"x":[...], "y":[...]}`。

**params**：`force_zero`（true=过原点，无截距）。**返回 stats**：`slope, slope_se, slope_ci, intercept, intercept_se, t, p_value, r2, r2_adj, f_value, f_pvalue, residual_sd, n, equation, interpretation`。

### logistic_regression — S 形 + 二分类

**数据 dict**：`{"x":[...], "y":[...], "resp":[0/1...]}`（resp 缺省时按 y>50 自动生成）。

**params**：`five_pl`（false=4PL，true=5PL，曲线不对称时用）。**返回 stats**：`model(4PL/5PL), params{...}, ic50, ic50_ci95, hill, r2, classification_accuracy, n, interpretation`。Hill 偏离 1 提示多位点/协同。

### deming_regression — X/Y 均有误差

**数据 dict**：`{"x":[...], "y":[...], "var_x":<X方差>, "var_y":<Y方差>}`（λ=var_x/var_y）。

**params**：`lambda_source`（true=用数据里的 var_x/var_y；manual=用 lam_manual）；`lam_manual`（手动 λ）。**返回 stats**：`intercept, slope, slope_se, slope_ci95, lambda, lambda_source, ols_slope, n, interpretation`。两仪器都有误差时用 Deming 而非 OLS。

### standard_curve_interpolation — 反算浓度

**数据 dict**：`{"x":[...], "y":[...], "unk_y":[...], "unk_true":[...]}`（x/y=标准品；unk_y=未知样本测得 Y；unk_true=真实浓度，无标注传全 0 仅作占位）。

**params**：`fit_model`（4pl/linear）。**返回 stats**：`fit_model, r2, std_params, unknowns[{sample,true_conc,measured_y,predicted_conc,error_pct,extrapolated}], n_extrapolated, interpretation`。外推（logx 超出标准曲线范围）结果不可靠。

## Custom Code 模板（IOData 返回）

非线性回归示例：返回参数表 + 拟合曲线图。

```python
import numpy as np
import pandas as pd
import plotly.graph_objects as go

def custom_code(inputs, **kwargs):
    import statlib
    df = inputs[0].data
    data = {"x": np.log10(df["conc"]).tolist(), "y": df["response"].astype(float).tolist()}
    params = {"model":"four_pl", "weighting":"1/y2", "robust":True, "compare":True}
    r = statlib.run("nonlinear_regression", params, data)
    s = r["stats"]
    # 1) 参数表
    params_df = pd.DataFrame(s["params"])
    derived = s.get("derived", {})
    params_df.loc[len(params_df)] = {"param":"IC50", "value":derived.get("ic50"),
        "se":None, "ci95":derived.get("ic50_ci95")}
    params_df["r2"] = s["r2"]
    # 2) 拟合曲线图（用拟合参数重画平滑线）
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=data["x"], y=data["y"], mode="markers", name="观测"))
    # 取拟合参数构造平滑曲线（4PL：Bottom+(Top-Bottom)/(1+10^((LogEC50-x)*Hill))）
    p = {row["param"]: row["value"] for row in s["params"]}
    xs = np.linspace(min(data["x"]), max(data["x"]), 200)
    ys = p["Bottom"] + (p["Top"]-p["Bottom"]) / (1 + 10**((p["LogEC50"]-xs)*p["Hill"]))
    fig.add_trace(go.Scatter(x=xs, y=ys, mode="lines", name="拟合"))
    fig.update_layout(title=s["interpretation"], xaxis_title="log10 浓度", yaxis_title="响应")
    return [
        IOData(name="fit_params", data=params_df),
        IOData(name="fit_curve", data=fig),
    ]
```

> `IOData` 已被 worker 注入。`go.Figure` → 只读 Python 图节点（chartId=`stepId::name`）。

## 取舍边界（与原生步骤）

- 只要散点/折线看趋势 → `create_view` + `set_chart_config`（scatter/line）即可，**不必**开 custom code。
- 需要 **IC50/EC50/Vmax/Km/半衰期 + 参数 CI + R²/AICc + 模型比较** 这类拟合推断结论时才用本 skill。
- 4PL/5PL 优先 `nonlinear_regression`（lmfit）；只算未知浓度走 `standard_curve_interpolation`。
- 写完代码后调 `run_python_code` 验证（草稿执行不影响正式输出），报错就修，不让用户试错。

## 参数启发式（按意图设默认）

- S 形剂量反应、默认 → `model=four_pl`，不动 weighting（equal）。
- 低浓度区方差明显变大（生化复孔常见）→ `weighting=1/y2`。
- 怀疑离群点 → `robust=true`。
- 不确定用哪个模型 → `compare=true` 看 AICc 比较表，delta_aicc<2 视为等效。
- 曲线明显不对称（上下渐近不同曲率）→ `model=five_pl` 或 `logistic_regression` + `five_pl=true`。
- 酶动力学（速率 vs 底物）→ `model=mm`。
- 信号衰减/动力学 → `model=exp_decay`（看 half_life）。
- 仪器/方法比对且 X 也有误差 → `deming_regression`；λ 已知方差比传 `lambda_source=true` 并在 data 里给 var_x/var_y，否则 `lambda_source=manual, lam_manual=1`。
- 标准曲线反算浓度：S 形 → `fit_model=4pl`；线性段 → `fit_model=linear`；关注外推样本（`extrapolated=true` 的不可靠，建议稀释重测）。
