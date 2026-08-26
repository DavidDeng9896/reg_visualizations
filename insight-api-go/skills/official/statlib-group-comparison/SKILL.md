# statlib 组间比较检验

在 Custom Code 节点用 `statlib` 做「两组 / 多组差异是否显著」的假设检验。覆盖 4 个方法：

| 方法 | statlib.run 名 | 回答的问题 |
|---|---|---|
| t 检验（含 Shapiro 预检） | `t_test` | 两组差异是否显著（独立/成对/单样本 vs 理论值） |
| 单因素 ANOVA + 事后检验 | `anova` | ≥3 组之间是否有差异，哪两组有差异 |
| 单样本检验 vs 理论值 | `one_sample_test` | 一组样本均值是否偏离某个已知理论值 |
| P 值堆栈 + 多重比较校正 | `p_value_stack` | 批量特征（如基因）在两组间差异，校正后哪些真显著 |

## 何时用本 skill

**意图词**：比较 / 差异 / 显著 / t 检验 / ANOVA / 对照 vs 处理 / 是否不同 / 哪组更高 / 批量差异基因。

**数据形状 → 方法**（看上游 inputs 的列结构）：
- 上游是 2 列数值（或 1 列分组 + 1 列数值，两个水平）→ `t_test`
  - 同一对象前后两测 / 配对实验 → `design=paired`
  - 两组独立样本 → `design=unpaired`
- 上游是 ≥3 组数值（或多水平分组列 + 数值列）→ `anova`
- 上游是 1 列数值 + 用户口述一个理论值 → `one_sample_test`
- 上游是「特征×样本」矩阵（如基因表达 ctrl/trt 两块）→ `p_value_stack`

**何时别用**：只看分布形态/正态性/离群点 → `statlib-distribution-outlier`；要拟合曲线/IC50 → `statlib-dose-response-fitting`；要分类器 ROC / 方法一致性 → `statlib-classifier-agreement`；要纯信号平滑/积分/相关 → `statlib-signal-correlation`。

## 调用契约（所有方法通用）

```python
import statlib
result = statlib.run(method, params, data)   # data 缺省时用各方法合成演示数据
# result = {"method", "stats": {..., "interpretation": str}, "params", "data"}
# stats 全部可 JSON 序列化；interpretation 是中文一句话结论
```

**关键**：statlib 的 `data` 是 **dict**，不是 DataFrame。必须把上游 `inputs[i].data`（DataFrame）转成方法要求的 dict。下面每个方法给出转换写法。

## 方法详解

### t_test — 两组 / 成对 / 单样本差异

**数据 dict**：
- 独立两组：`{"a":[...], "b":[...], "design":"unpaired"}`
- 成对两组：`{"a":[...], "b":[...], "design":"paired"}`（a/b 等长且同序）
- 单样本：`{"x":[...], "design":"onesample", "mu0": <理论值>}`

**params**：
| 参数 | 默认 | 取值 / 含义 |
|---|---|---|
| `design` | unpaired | unpaired/paired/onesample（也可只写在 data 里，data 优先） |
| `gauss` | auto | auto=先 Shapiro 预检自动选参数/非参数；yes=强制参数；no=强制非参数（Mann-Whitney / Wilcoxon） |
| `equal_var` | welch | welch/equal，仅 unpaired 参数路径用 |
| `tail` | 2 | 2=双尾；1=单尾 |

**返回 stats**：`design, test, statistic, p_value, mean_diff, ci95, cohens_d, n, decision_path, significant, interpretation`。`test` 会是 `Welch t / Student t / Mann-Whitney U / Paired t / Wilcoxon / One-sample t / Wilcoxon signed-rank`，取决于自动决策。

**从 DataFrame 转**：
```python
df = inputs[0].data
# 长格式（列 group, value，两个水平如 "ctrl"/"trt"）
a = df[df["group"]=="ctrl"]["value"].astype(float).tolist()
b = df[df["group"]=="trt"]["value"].astype(float).tolist()
data = {"a": a, "b": b, "design":"unpaired"}
# 宽格式（列 ctrl, trt，配对）
data = {"a": df["ctrl"].tolist(), "b": df["trt"].tolist(), "design":"paired"}
# 单样本 vs 理论值 10
data = {"x": df["value"].astype(float).tolist(), "design":"onesample", "mu0": 10}
```

### anova — ≥3 组差异 + 事后两两比较

**数据 dict**：`{"groups": [[g1...], [g2...], [g3...], ...]}`（每组的数值列表，可不等长）。

**params**：
| 参数 | 默认 | 取值 / 含义 |
|---|---|---|
| `approach` | auto | auto=按 Shapiro+Levene 自动选；param=强制参数；nonparam=强制 Kruskal-Wallis |
| `posthoc` | tukey | tukey/dunnett/bonf，仅参数路径且 P<0.05 时跑 |
| `fdr` | 0.05 | 事后比较显著阈值 |

**决策路径**：Shapiro 查各组正态 + Levene 查方差齐性 → 方差齐用 ANOVA、不齐用 Welch ANOVA、非正态用 Kruskal-Wallis；P<0.05 才做事后比较。

**返回 stats**：`test, statistic, p_value, eta2, k, n_per_group, decision_path, posthoc[{pair,p_adj,significant}], n_significant_pairs, significant, interpretation`。

**从 DataFrame 转**：
```python
df = inputs[0].data  # 长格式：列 group, value
groups = [g["value"].astype(float).tolist() for _, g in df.groupby("group")]
data = {"groups": groups}
```

### one_sample_test — 一组 vs 理论值

**数据 dict**：`{"x":[...], "mu0": <理论值>}`。

**params**：`approach`（auto/t/w；auto=Shapiro 预检，t=单样本 t，w=Wilcoxon signed-rank）。

**返回 stats**：`test, statistic, p_value, mean, mean_minus_mu0, ci95, cohens_d, n, decision_path, significant, interpretation`。

**从 DataFrame 转**：`data = {"x": df["value"].astype(float).tolist(), "mu0": 10}`。

### p_value_stack — 批量特征差异 + 多重比较校正

**数据 dict**：`{"ctrl": [[...],...] 2d, "trt": [[...],...] 2d, "de_idx":[...]}`（ctrl/trt 形状 `(n_features, n_per_group)`；de_idx 是真实差异特征下标，用于评估灵敏度/精确率，无标注时传 `[]`）。

**params**：`test`（t=Mann-Whitney 否则 Welch t；默认 t）；`correction`（fdr_bh/holm/bonferroni/none）；`fdr`（0.05 显著阈值）。

**返回 stats**：`n_genes, n_per_group, test, correction, pvals[], qvals[], lfc[], n_sig_raw, n_sig_adj, n_true_de, sensitivity, precision, top10[{gene,lfc,p,q,significant}], interpretation`。

**从 DataFrame 转**：上游通常是「宽表=特征行×样本列」的两块（ctrl 表、trt 表），各 `n_features` 行：
```python
ctrl_df, trt_df = inputs[0].data, inputs[1].data
ctrl = ctrl_df.astype(float).values.tolist()   # list[list] (features × reps)
trt  = trt_df.astype(float).values.tolist()
data = {"ctrl": ctrl, "trt": trt, "de_idx": []}
```

## Custom Code 模板（IOData 返回）

返回 `list[IOData]`：关键统计量做成表（DataFrame），必要时配一张图（go.Figure）。模板示 t_test：

```python
from io import BytesIO
import pandas as pd
import plotly.graph_objects as go

def custom_code(inputs, **kwargs):
    import statlib
    df = inputs[0].data
    a = df[df["group"]=="ctrl"]["value"].astype(float).tolist()
    b = df[df["group"]=="trt"]["value"].astype(float).tolist()
    r = statlib.run("t_test", {"gauss":"auto","tail":2}, {"a":a,"b":b,"design":"unpaired"})
    s = r["stats"]
    # 1) 关键统计量表
    stats_df = pd.DataFrame([{
        "test": s["test"], "statistic": round(s["statistic"],3),
        "p_value": s["p_value"], "mean_diff": round(s["mean_diff"],3),
        "cohens_d": round(s["cohens_d"],3), "significant": s["significant"],
        "interpretation": s["interpretation"],
    }])
    # 2) 可选：两组箱线图
    fig = go.Figure()
    fig.add_trace(go.Box(y=a, name="ctrl")); fig.add_trace(go.Box(y=b, name="trt"))
    fig.update_layout(title=s["interpretation"])
    return [
        IOData(name="t_test_stats", data=stats_df),
        IOData(name="group_box", data=fig),
    ]
```

> `IOData` 已被 worker 注入，无需 import。DataFrame → 自动物化为表节点；`go.Figure` → 自动长出只读 Python 图节点（chartId=`stepId::name`）。

## 取舍边界（与原生步骤）

- 只是要「柱图/箱线图看各组高低」 → 用 `create_view` + `set_chart_config`（box/bar），**不要**为画图而开 custom code。
- 需要 **P 值 / 效应量 / 决策路径 / 多重比较校正** 这类统计推断结论时才用本 skill 的 custom code。
- 校正后的显著对、η²、Cohen's d 等放进返回的统计量表，再可选用图呈现。
- 写完代码后调用 `run_python_code` 验证（草稿执行不影响正式输出），报错就修，不要让用户试错。

## 参数启发式（按意图设默认）

- 不确定正态性 → `gauss/approach=auto`，让 statlib 用 Shapiro 自动决策（默认即可，不传也行）。
- 生物学重复独立两组 → `design=unpaired, equal_var=welch`（Welch 更稳，方差不齐也能用）。
- 同一对象前后/左右配对 → `design=paired`。
- 方向性假设（只关心处理是否高于对照）→ `tail=1`；否则 `tail=2`。
- ≥3 组、担心方差不齐 → `approach=auto` 自动切 Welch ANOVA；想强制非参数 → `approach=nonparam`。
- 事后要和对照比 → `posthoc=dunnett`；全两两 → `posthoc=tukey`。
- 批量特征（几十~几千）→ `correction=fdr_bh`（默认，平衡灵敏与精确）；只确认无差异 → `correction=bonferroni`（更保守）。
