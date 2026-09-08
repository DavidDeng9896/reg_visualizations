# statlib 分类器与一致性

在 Custom Code 节点用 `statlib` 做「分类器判别能力评估」与「两种测量方法一致性」。覆盖 2 个方法：

| 方法 | statlib.run 名 | 回答的问题 |
|---|---|---|
| ROC 曲线 + Youden 阈值 | `roc_curve` | 一个连续指标判别 case/ctrl 的能力（AUC+CI、最佳阈值处灵敏度/特异度） |
| Bland-Altman 一致性 | `bland_altman` | 两种方法/仪器测同一批样本能否互换（偏倚、95% 一致性界限、比例偏倚） |

## 何时用本 skill

**意图词**：ROC / AUC / 灵敏度 / 特异度 / 判别 / 阈值 / cut-off / Youden / 诊断 / Bland-Altman / 一致性 / 两种方法 / 仪器对比 / 可互换。

**数据形状 → 方法**：
- 两个数值数组：一组病例(case)、一组对照(ctrl)的指标值 → `roc_curve`
- 两组配对测量值 m1、m2（同一样本两种方法各测一次）→ `bland_altman`

**何时别用**：要组间差异检验 → `statlib-group-comparison`；要分布/离群 → `statlib-distribution-outlier`；要曲线拟合 → `statlib-dose-response-fitting`；纯信号平滑/积分/相关 → `statlib-signal-correlation`。注意：Deming 回归（X/Y 均有误差的回归关系）在 `statlib-dose-response-fitting`，不在本 skill；本 skill 的 Bland-Altman 关注的是「差值 vs 均值」的一致性界限，不是回归斜率。

## 调用契约（通用）

```python
import statlib
result = statlib.run(method, params, data)   # data 缺省用合成数据
# result = {"method","stats":{...,"interpretation":str},"params","data"}
```

**关键**：statlib 的 `data` 是 **dict**，不是 DataFrame。需把上游 DataFrame 转成方法要求的 dict。

## 方法详解

### roc_curve — ROC + AUC + Youden

**数据 dict**：`{"case":[...], "ctrl":[...]}`（case=阳性样本的指标值数组，ctrl=阴性样本的指标值数组；指标越高越像阳性）。

**params**：无必填。

**返回 stats**：`auc, auc_ci95[lo,hi], quality(excellent>0.9/good>0.8/moderate>0.7/poor), youden_threshold, sensitivity, specificity, n_case, n_ctrl, roc_curve{fpr[],tpr[]}, interpretation`。AUC 用 Bootstrap(2000) 算 95%CI；Youden 阈值=使 (TPR−FPR) 最大的点。

**从 DataFrame 转**：
```python
df = inputs[0].data  # 长格式：列 label(0/1), score
case = df[df["label"]==1]["score"].astype(float).tolist()
ctrl = df[df["label"]==0]["score"].astype(float).tolist()
data = {"case": case, "ctrl": ctrl}
# 或两列各为一组
data = {"case": df["case"].tolist(), "ctrl": df["ctrl"].tolist()}
```

### bland_altman — 两种方法一致性

**数据 dict**：`{"m1":[...], "m2":[...]}`（m1/m2 等长，同一样本两种方法各测一次）。

**params**：无必填。

**返回 stats**：`bias, diff_sd, loa_lo, loa_hi, loa_ci95{lo:[lo,hi],hi:[lo,hi]}, bias_test{t,p}, proportional_bias{slope,p,present}, n, interpretation`。
- `bias`：平均差值（m2−m1），`bias_test.p` 检验偏倚是否显著偏离 0。
- `loa_lo/loa_hi`：95% 一致性界限（bias±1.96·SD），`loa_ci95` 是界限本身的 CI。
- `proportional_bias`：差值对均值的回归斜率，`present=true` 提示差值随水平变化（比例偏倚）。

**从 DataFrame 转**：
```python
df = inputs[0].data  # 列 m1, m2（或 method_a, method_b）
data = {"m1": df["m1"].astype(float).tolist(), "m2": df["m2"].astype(float).tolist()}
```

## Custom Code 模板（IOData 返回）

ROC 示例：返回关键指标表 + ROC 曲线图。

```python
import pandas as pd
import plotly.graph_objects as go

def custom_code(inputs, **kwargs):
    import statlib
    df = inputs[0].data
    case = df[df["label"]==1]["score"].astype(float).tolist()
    ctrl = df[df["label"]==0]["score"].astype(float).tolist()
    r = statlib.run("roc_curve", {}, {"case":case,"ctrl":ctrl})
    s = r["stats"]
    # 1) 关键指标表
    stats_df = pd.DataFrame([{
        "auc": round(s["auc"],3),
        "auc_ci95": f"{s['auc_ci95'][0]:.3f}~{s['auc_ci95'][1]:.3f}",
        "quality": s["quality"],
        "youden_threshold": round(s["youden_threshold"],3),
        "sensitivity": round(s["sensitivity"],3),
        "specificity": round(s["specificity"],3),
        "interpretation": s["interpretation"],
    }])
    # 2) ROC 曲线
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=s["roc_curve"]["fpr"], y=s["roc_curve"]["tpr"],
                             mode="lines", name=f"AUC={s['auc']:.3f}"))
    fig.add_trace(go.Scatter(x=[0,1], y=[0,1], mode="lines", line=dict(dash="dash",color="gray"), showlegend=False))
    fig.update_layout(title=s["interpretation"], xaxis_title="1-特异度", yaxis_title="灵敏度")
    return [
        IOData(name="roc_stats", data=stats_df),
        IOData(name="roc_curve", data=fig),
    ]
```

Bland-Altman 示例（差值 vs 均值散点 + 一致性界限）：

```python
def custom_code(inputs, **kwargs):
    import statlib, numpy as np
    df = inputs[0].data
    r = statlib.run("bland_altman", {}, {"m1":df["m1"].tolist(),"m2":df["m2"].tolist()})
    s = r["stats"]
    mean = ((df["m1"]+df["m2"])/2).tolist(); diff = (df["m2"]-df["m1"]).tolist()
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=mean, y=diff, mode="markers", name="样本"))
    fig.add_hline(y=s["bias"], line_color="blue", annotation_text=f"bias={s['bias']:.2f}")
    fig.add_hline(y=s["loa_lo"], line_dash="dash", line_color="red", annotation_text=f"LoA={s['loa_lo']:.2f}")
    fig.add_hline(y=s["loa_hi"], line_dash="dash", line_color="red", annotation_text=f"LoA={s['loa_hi']:.2f}")
    fig.update_layout(title=s["interpretation"], xaxis_title="(m1+m2)/2", yaxis_title="m2-m1")
    return [IOData(name="bland_altman", data=fig)]
```

> `IOData` 已被 worker 注入。DataFrame→表节点；`go.Figure`→只读 Python 图节点（chartId=`stepId::name`）。

## 取舍边界（与原生步骤）

- 只要散点看两方法关系 → `create_view` + `set_chart_config`（scatter），**不必**开 custom code。
- 需要 **AUC+CI / Youden 阈值 / 灵敏度特异度** 或 **偏倚+95%LoA+比例偏倚检验** 这类定量一致性结论时才用本 skill。
- 一致性界限是否临床可接受需领域判断——statlib 只给统计量，不替你下「可互换」的结论。
- 写完代码后调 `run_python_code` 验证，报错就修，不让用户试错。

## 参数启发式（按意图设默认）

- ROC：本方法无必填参数，直接传 `{"case":[...],"ctrl":[...]}` 即可；指标越高越像阳性（如默认构造）。若实际是「越低越阳性」，应在数据准备阶段取负或翻转，statlib 不自带方向参数。
- Bland-Altman：无必填参数。默认假设 m2−m1 的偏倚方向；如关心 m1 为参考基准，确保 m1 放对位置。
- 想看更稳的 AUC CI：保持默认 Bootstrap（2000 次）；样本量<20 时 CI 会很宽，应在 interpretation 提示样本不足。
