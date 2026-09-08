# GraphPad Prism 分析功能细粒度解析
> 每个功能按五个维度拆解：功能定位与用处 → Prism 参数配置（对话框级）→ 真实实例 → 统计实现逻辑 → Python 落地方案
> 目标：为「AI 驱动 Python 复刻/超越 Prism」提供可直接转 PRD 的需求细节。

---

# 第一部分 XY Analyses

XY 表格的结构：X 列（自变量，如浓度、时间）+ 若干 Y 列（响应值，可有复孔/重复）。
这一组分析研究 **X 与 Y 的定量关系**：拟合、插值、变换、相关。

---

## 1. Nonlinear Regression（非线性回归 / 曲线拟合）

### 1.1 用处（详细说明）
- 用一个**已知数学形式的模型**去拟合数据，目的不是画一条光滑线，而是：
  1. **提取有生物学/物理意义的参数**：EC50、IC50、Hill 斜率、Vmax、Km、Kd、半衰期、生长速率、平台值……
  2. **量化不确定性**：每个参数的 SE、95% CI。
  3. **模型间比较**：两个模型哪个更能解释数据（F 检验 / AICc）。
  4. **预测与插值**：由拟合曲线反推未测点的值。
- 与线性回归的本质区别：参数以非线性方式进入方程，必须**迭代优化**（无闭式解），因此初始值、约束、权重设置都会影响结果——这正是它需要一大堆对话框选项的原因。

### 1.2 Prism 参数配置（对话框级）
**(a) Model 选项卡 —— 选方程族**（这是核心，Prism 内置约 80+ 方程，按场景分类）：

| 方程类别 | 代表方程 | 关键参数 |
|---|---|---|
| Dose-response（剂量反应） | log(agonist) vs response（4PL，可变斜率）、log(inhibitor) vs response、双相剂量反应、Gaussian 剂量反应 | Bottom, Top, LogEC50, HillSlope |
| Enzyme kinetics（酶动力学） | Michaelis-Menten、变构 S 形（Hill）、底物抑制、混合型抑制 | Vmax, Km, (n, Khalf, V0.5, alpha, Ki) |
| Growth curves（生长曲线） | 指数生长、Gompertz、logistic、Baranyi-Richards、Stannard | 生长速率、延迟期、平台 |
| Exponential（指数） | 单相/双相/三相衰减、单相/双相关联、指数平台、PULSE | Span, K(速率常数), Plateau, t1/2(派生) |
| Saturation binding（饱和结合） | 单位点总结合、非特异结合、双位点 | Bmax, Kd |
| Kinetic binding（动力学结合） | 结合/解离动力学 | kon, koff |
| Gaussian/峰形 | Gaussian、Lorentzian、偏态 Gaussian | 中心、宽度、面积 |
| Polynomial | 二阶、三阶多项式 | 系数 |
| Sigmoid | Boltzmann sigmoid | V50, 斜率 |
| Spline / LOWESS | 无参数模型 | 平滑度 |
| Custom | 用户自定义方程 | — |

**(b) Parameters 选项卡**
- 每个参数设置**初始值**（Prism 允许从数据自动估计初始值）；
- **约束（Constrain）**：固定为常数、限制范围（如 Bottom≥0、HillSlope∈[0.2,5]）；
- **共享参数**：多条曲线共用一个参数（如同一批数据的 Bmax 相同，只比 Kd）。

**(c) Fit 选项卡**
- 拟合方法：普通最小二乘 vs **稳健回归（Robust，双权重 bisquare）**——抗离群点；
- **权重（Weighting）**：Equal / Y / Y² / 1/Y / 1/Y² —— 处理异方差（响应值越大误差越大的情况，如 ELISA）；
- 离群点处理：是否用 ROUT 法剔除；
- 迭代设置：最大迭代次数（默认 1000）、收敛判据。

**(d) Compare 选项卡**
- **Extra sum-of-squares F test**：嵌套模型比较（如单相衰减 vs 双相衰减）；
- **AICc**：非嵌套模型比较，输出各模型相对似然/权重。

**(e) 输出**
- 参数估计值 ± SE、95% CI；R²、总平方和；参数间相关矩阵；派生值（如 t1/2 = ln2/K、IC50 = 10^LogIC50）。

### 1.3 真实实例
1. **药物 IC50 测定（最高频场景）**：肿瘤细胞用 8 个浓度的伊马替尼处理 72h，CCK-8 测活力。X=log10(浓度)，Y=存活率%。拟合 `log(inhibitor) vs. response -- Variable slope (four parameters)`，输出 IC50 及 95% CI、Hill 斜率。Hill 斜率偏离 1 提示多位点结合或协同效应。
2. **酶动力学**：己糖激酶在不同葡萄糖浓度（0.5–100 mM）下的初速度，Michaelis-Menten 拟合得 Km、Vmax；再加抑制剂做混合型抑制拟合求 Ki。
3. **受体结合实验**：放射性配体 12 个浓度的饱和结合，拟合 One site – Specific binding 得 Bmax 和 Kd。
4. **病毒/细菌生长曲线**：OD600 随时间变化，Gompertz 或 Baranyi-Richards 拟合，得到延滞期 λ、最大生长速率 μmax、平台 A。
5. **药代动力学**：给药后血药浓度-时间曲线，双相指数衰减拟合，得分布/消除相半衰期。

### 1.4 统计实现逻辑
1. 定义模型函数 f(X; θ)；
2. 构造目标：加权残差平方和 Σ wᵢ(Yᵢ − f(Xᵢ;θ))²（稳健法改用 M 估计损失）；
3. **迭代优化**：Levenberg-Marquardt（或 Trust Region Reflective，支持参数边界）；
4. 收敛后：雅可比矩阵 → 参数协方差矩阵 → SE 与 CI（近似正态假设）；
5. 诊断：残差图、R²（=1−SSres/SStot）、AICc = n·ln(SS/n) + 2k + 2k(k+1)/(n−k−1)；
6. 模型比较：F = ((SS1−SS2)/(df1−df2)) / (SS2/df2)，或 ΔAICc → 模型权重。

### 1.5 Python 落地方案
**首选 `lmfit`（最接近 Prism 的交互模型），底层 scipy.optimize。**

```python
from lmfit.models import ExpressionModel
# 4PL 剂量反应（Prism 的 log(inhibitor) vs response）
eq = 'bottom + (top-bottom)/(1 + 10**((x-logIC50)*hill))'
model = ExpressionModel(eq)
params = model.make_params(
    bottom=0, top=100, logIC50=-6, hill=1)   # 初始值（可由数据启发式估计）
params['bottom'].set(min=0)                    # 约束 = Prism 的 Constrain
params['hill'].set(min=0.2, max=5)
# 权重：1/Y 对应 ELISA 类异方差
weights = 1/np.abs(y)
result = model.fit(y, x=x, params=params, weights=weights)
# 输出：result.params（含 stderr、置信区间）、result.rsquared、result.aic
```
关键工程点：
- **初始值启发式**（替代人工输入）：bottom/top = 数据 min/max（或分位数）；logEC50 = 响应达到 (top+bottom)/2 处的 X；hill 默认 ±1（激动剂+1、抑制剂按方向）。
- **模型库**：把上表 80+ 方程注册成字典 `{name: (公式, 参数说明, 默认约束, 领域标签)}`，供 AI 检索选择。
- **稳健拟合**：`model.fit(..., method='least_squares', fit_kws={'loss':'soft_l1'})` 对应 Prism robust。
- **模型比较**：`lmfit` 提供 `result.aic`；F 检验手写 5 行（scipy.stats.f.sf）。
- **派生量**：`lmfit` 的 `Parameters.add()` 可定义 IC50 = 10**logIC50 并自动传误差。

---

## 2. Simple Linear Regression（简单线性回归）

### 2.1 用处
- 建立 Y = 斜率·X + 截距 的直线关系，判断趋势是否存在（斜率显著 ≠ 0）、关系强度（R²），并用于**正向外推预测**和**反向插值（由 Y 求 X）**。
- 是非线性拟合的基线对照。

### 2.2 Prism 参数配置
- **是否强制过原点**（force through origin）：截距=0；
- 复孔处理：逐点回归 vs 先取均值再回归；
- 输出：斜率 ± CI、截距 ± CI、X 截距、R²、P 值（F 检验斜率=0）、残差；
- **插值选项**：输入未知 Y 反算 X（带 CI）；
- 图形：拟合线 ± 置信带 / 预测带（confidence band vs prediction band）。

### 2.3 真实实例
1. **Bradford 蛋白定量**：BSA 标准品 0–2000 µg/mL 的 A595，直线拟合后由样品 A595 反算蛋白浓度。
2. **qPCR 标准曲线效率**：Ct 对 log10(模板拷贝数) 回归，斜率 → 扩增效率 E = 10^(−1/slope) − 1（理想 −3.32 → 100%）。
3. **Beer-Lambert 定律校准**：吸光度 vs 浓度。
4. 临床：糖化血红蛋白 vs 平均血糖的换算关系。

### 2.4 实现逻辑
最小二乘闭式解；斜率显著性用 F 检验（等价 t 检验）；CI 来自斜率/截距的 SE（t 分布）；反算 X₀ = (Y₀ − b)/k 的 CI 用预测方差公式（delta 法）。

### 2.5 Python 落地方案
```python
from scipy import stats
res = stats.linregress(x, y)   # slope, intercept, r, p, stderr
# 需要 CI / 预测带 / 过原点 / 反插值时升级到 statsmodels：
import statsmodels.api as sm
model = sm.OLS(y, sm.add_constant(x)).fit()   # 过原点则不加常数
pred = model.get_prediction([[1, x_new]])
pred.summary_frame(alpha=0.05)  # mean_ci_lower/upper, obs_ci_lower/upper
```
- 过原点：`sm.OLS(y, x)`（不加 constant）。
- 反插值：解方程 + 用 `get_prediction` 的区间换算，或 bootstrap。
- 图形：matplotlib `fill_between` 画置信带。

---

## 3. Simple Logistic Regression（简单 logistic 回归）

### 3.1 用处
- 拟合 **S 形（Sigmoid）曲线**，且响应有天然上下界（如 0~1 的比例、0~100% 的占比）。
- 注意：Prism 里的 "simple logistic regression" 是**曲线拟合**（S 形函数拟合连续响应），不是分类意义的逻辑回归——这是最容易混淆的点。

### 3.2 Prism 参数配置
- 方程形式：Y = Bottom + (Top − Bottom)/(1 + exp((X − X₅₀)/slope))（升/降 S 两个方向）；
- 是否固定 Bottom=0、Top=1（比例数据）或自由估计；
- 输出：X₅₀（半数效应点）、斜率、Hill 斜率换算。

### 3.3 真实实例
1. **电生理/行为学剂量反应**：刺激强度 vs 产生反应的比例（0→1），求半数有效强度。
2. **细胞存活率**：低/高浓度平台为 0 和 1 的药物反应（简化 4PL，固定平台）。
3. **氧合曲线**：PO₂ vs 血红蛋白氧饱和度。
4. **qPCR 扩增曲线拐点分析**（衍生用法）。

### 3.4 实现逻辑
仍是非线性最小二乘（3 或 4 参数），与上一节同一套迭代机制；若响应真的是二项计数（成功数/总数），则应改用**极大似然二项 GLM**（真正的 logistic 回归），Prism 对话框不做这个，Python 方案应两种都支持并按数据结构自动区分。

### 3.5 Python 落地方案
```python
from lmfit.models import ExpressionModel
logistic = 'bottom + (top-bottom)/(1 + exp((x-x50)/slope))'
# 比例数据固定平台：
params['bottom'].set(value=0, vary=False)
params['top'].set(value=1, vary=False)
# 若数据是 (成功数, 总数) 形式：
import statsmodels.api as sm
sm.GLM(cbind(success, fail), X, family=sm.families.Binomial()).fit()
```
**AI 决策点**：响应是连续百分比 → S 形拟合；响应是计数对 → 二项 GLM。

---

## 4. Fit Spline / LOWESS

### 4.1 用处
- **不假设任何模型形状**的拟合：数据形态未知、机制不明，或纯粹为了插值/平滑。
- 常作为标准曲线拟合的兜底（4PL 拟合失败时的退路），以及计算 AUC 前的曲线重建。

### 4.2 Prism 参数配置
- **Spline**：
  - 插值模式：每段插入多少个点（如每段 2×/5× 数据点数）→ 输出更密的曲线；
  - 平滑样条：粗糙度/平滑参数（越大越光滑，0 = 精确过点）；
- **LOWESS**：
  - 每个局部回归使用的点的比例（Prism 中为"percentage of points"，如 20%–50%）——比例越大越平滑、越迟钝。
- 输出：新 X 网格上的 Y 值（可继续做 AUC、插值）。

### 4.3 真实实例
1. **无模型可用的标准曲线**：某些侧向层析/比色法的响应曲线形状怪异，直接用样条插值定量。
2. **传感器噪声平滑**：连续血糖监测信号的 LOWESS 平滑。
3. **不规则采样的时间序列重建**：给药后不规则时间点采血，样条重建后再算 AUC。

### 4.4 实现逻辑
- 三次样条：分段三次多项式，节点处二阶导连续；平滑样条在拟合优度与曲线粗糙度之间加惩罚项 λ∫f″²；
- LOWESS：对每个目标点，取邻域比例内的点做加权局部线性回归（三次权函数，权重随距离衰减），可迭代稳健化。

### 4.5 Python 落地方案
```python
from scipy.interpolate import UnivariateSpline, CubicSpline
spline = UnivariateSpline(x, y, s=smoothing)   # s=平滑参数, s=0 精确插值
xs = np.linspace(x.min(), x.max(), len(x)*5)   # 每段 5× 加密
ys = spline(xs)

from statsmodels.nonparametric.smoothers_lowess import lowess
ys = lowess(y, x, frac=0.3)   # frac = Prism 的百分比/100
```
注意：LOWESS 输出不保证单调，反插值前需检查单调性或改用 PChip（`scipy.interpolate.PchipInterpolator`，保形单调）。

---

## 5. Smooth, Differentiate or Integrate（平滑 / 求导 / 积分）

### 5.1 用处
对曲线做数学变换，属于"数据预处理 + 特征提取"工具：
- **平滑**：去噪但尽量保形；
- **求导**：把"累积量"变成"速率"；
- **积分**：把"速率"变成"累积量"。

### 5.2 Prism 参数配置（Transform 对话框）
- Smooth：
  - 方法：Moving average（窗口点数）、**Savitzky-Golay**（窗口点数 + 多项式阶数，Prism 默认推荐，因为保峰形）、LOWESS（比例）；
- Differentiate：一阶导 / 二阶导，先平滑后求导（窗口同平滑）；
- Integrate：累积面积（从第一个 X 到每个 X）。

### 5.3 真实实例
1. **微生物生长速率**：OD 曲线一阶导 → 瞬时生长速率曲线，找最大生长速率时刻。
2. **色谱/光谱**：Savitzky-Golay 平滑后积分求峰面积；二阶导定位肩峰。
3. **钙成像**：荧光信号平滑后求导判断响应起始。
4. **代谢实验**：耗氧速率曲线积分得总耗氧量。

### 5.4 实现逻辑
- Savitzky-Golay：窗口内最小二乘拟合多项式，卷积形式求平滑值及导数；
- 求导本质是放大数据噪声，所以标准流程是**先平滑再求导**；
- 积分用累积梯形法。

### 5.5 Python 落地方案
```python
from scipy.signal import savgol_filter
y_smooth = savgol_filter(y, window_length=11, polyorder=3)   # 窗口须为奇数
dy_dx = savgol_filter(y, window_length=11, polyorder=3, deriv=1, delta=x[1]-x[0])
from scipy.integrate import cumulative_trapezoid
y_cum = cumulative_trapezoid(y, x, initial=0)
```
参数推荐规则（可写进 AI 决策）：窗口 ≈ 数据点数/20 取奇数，polyorder=2 或 3。

---

## 6. Area Under Curve（曲线下面积）

### 6.1 用处
把整条曲线压缩成一个标量，便于组间统计比较（之后拿 AUC 值进 t 检验/ANOVA）。

### 6.2 Prism 参数配置
- **基线（Baseline）**：Y=0 还是自定义基线（如响应基线值）；
- 范围：全范围或指定 X 区间；
- 方向处理：负面积是计入、扣除还是忽略；
- 输出：Area、占总面积百分比（多曲线比较时）；
- 对每行（每条曲线）分别计算。

### 6.3 真实实例
1. **PK 的 AUC₀₋ₜ**：血药浓度-时间曲线下面积，反映总暴露量；（专业扩展：线性梯形 vs 对数梯形法，药代规范用对数梯形处理衰减相）。
2. **OGTT**：口服葡萄糖耐量试验血糖 AUC，比较代谢能力。
3. **色谱定量**：峰面积定量。
4. **炎症模型**：爪肿胀度-时间曲线 AUC 比较药效。

### 6.4 实现逻辑
梯形法则：A = Σ (xᵢ₊₁−xᵢ)·(ȳᵢ) − 基线×区间宽。

### 6.5 Python 落地方案
```python
from scipy.integrate import trapezoid
area = trapezoid(y - baseline, x)
# PK 对数梯形（衰减段）：
def log_trap(c1, c2, t1, t2):
    return (c1-c2)*(t2-t1)/np.log(c1/c2) if c1>0 and c2>0 else trapezoid([c1,c2],[t1,t2])
```
输出 DataFrame：每条曲线一行（subject, group, area），直接接下游组间检验。

---

## 7. Deming (Model II) Linear Regression

### 7.1 用处
- 普通回归假设 X 无误差、Y 有误差；当 **X 和 Y 都有测量误差**（两种测量方法比较）时，OLS 会系统性低估斜率，必须用 Deming / Model II 回归。
- 是方法学一致性研究的标准工具之一（与 Bland-Altman 互补：Deming 看线性换算关系，B-A 看一致性与偏倚）。

### 7.2 Prism 参数配置
- **关键参数 λ**：X 与 Y 的方差比（Prism 让用户输入 λ = σ²ₓ/σ²ᵧ，或由重复测量数据估计；λ=1 即正交回归）；
- 输出：斜率、截距及其 95% CI（jackknife/重抽样）、相关系数 r；
- 选项：是否画回归带。

### 7.3 真实实例
1. **新肌酐检测法 vs 参考方法**（临床生化方法学比对，CLSI EP09 方案）。
2. **两种 ELISA 试剂盒测同一批血清**的换算关系。
3. 环境检测：便携式仪器 vs 实验室质谱定量。

### 7.4 实现逻辑
最小化残差在"考虑两轴误差"意义下的加权正交距离；给定 λ 有解析迭代解；CI 通常用 jackknife（留一法）或 bootstrap。

### 7.5 Python 落地方案
```python
from scipy.odr import ODR, Model, Data, RealData
# ODR（正交距离回归）= λ=1 的 Deming；RealData 可传每个点的 sx、sy → 广义 Deming
data = RealData(x, y, sx=sx, sy=sy)
odr = ODR(data, Model(lambda b,x: b[0]*x+b[1]), beta0=[1,0])
out = odr.run(); out.beta, out.sd_beta
```
- λ≠1 且无逐点误差时：手写 Deming 目标函数 + `scipy.optimize`，CI 用 bootstrap（500–2000 次重抽样）；
- 或引入 PyPI `deming` 包。
- 报告必须包含 λ 的取值依据（这是审稿人常问的点）。

---

## 8. Row Statistics（行统计）

### 8.1 用处
- Prism 表格中**一行 = 一个实验单元**（一个样本/动物/孔板的一行），跨列是不同条件或时间点。行统计做两件事：
  1. **复孔 QC**：每个样本技术重复的 Mean/SD/CV，CV 超标提示加样问题；
  2. **为配对分析造数据**：每行的差值、相对对照列的百分比（归一化），再进下游检验。

### 8.2 Prism 参数配置
- 选择统计量：Mean、SD、SEM、CV%、Median、Min、Max、N、Geometric mean…；
- 缺失值处理（跳过 vs 报错）；
- 转置输出；
- 衍生：计算"每行相对某列的百分比/差值"（Prism 的 Normalize 与 Difference 变换）。

### 8.3 真实实例
1. ELISA 双复孔：行 CV>15% 的样本剔除；
2. qPCR：同一 cDNA 的三个技术重复取均值后再算 ΔΔCt；
3. 自身前后对照：每个病人（行）的用药后−用药前差值，进 one-sample t 检验。

### 8.4 Python 落地方案
```python
import pandas as pd
row_stats = pd.DataFrame({
    'mean': df.mean(axis=1), 'sd': df.std(axis=1),
    'cv': df.std(axis=1)/df.mean(axis=1)*100,
    'n': df.notna().sum(axis=1)})
diff = df['post'] - df['pre']                 # 配对差值
norm = df.div(df['control'], axis=0) * 100     # 归一化到对照列
```
AI 增值点：自动标红 CV 超阈值的行并建议处理（复测/剔除，需记录理由）。

---

## 9. Correlation（相关分析）

### 9.1 用处
- 量化两个连续变量的**共变程度与方向**（不做因果/预测假设）：r 的绝对值 0–1，正负号定方向，P 值检验"总体中是否可能相关"。
- 与回归的区别：相关不区分自变量因变量、无截距概念。

### 9.2 Prism 参数配置
- **方法选择**：Pearson（要求近似双变量正态，度量线性）vs **Spearman**（秩相关，对单调关系稳健，不要求正态）；
- 是否对 X/Y 做 log 变换后再算；
- 复孔处理：用均值还是所有点对；
- 输出：r、R²、P、**r 的 95% CI（Fisher z 变换）**；
- 图形：散点图 + 拟合线（可选）。

### 9.3 真实实例
1. RNA-seq 与 qPCR 的基因表达量一致性（常用 Spearman，因数据偏态）。
2. BMI 与收缩压的相关性。
3. 两种评分量表（如病理评分 vs 影像评分）的关联。
4. 抗体滴度（log 转换后）与中和活性的相关。

### 9.4 实现逻辑
- Pearson：r = cov(x,y)/(σxσy)；P 值来自 t = r√((n−2)/(1−r²))；CI 用 Fisher z：z = atanh(r)，SE = 1/√(n−3)，再 tanh 回来；
- Spearman：先取秩再 Pearson；
- 注意：相关 ≠ 因果；离群点可伪造相关 → 报告时建议附散点图。

### 9.5 Python 落地方案
```python
from scipy.stats import pearsonr, spearmanr
r, p = pearsonr(x, y)
res = pearsonr(x, y, alternative='two-sided')
res.confidence_interval(0.95)   # SciPy ≥1.9 直接给 Fisher-z CI
```
- Spearman 的 CI：bootstrap（对观测对重抽样）；
- 扩展：相关矩阵热图（`seaborn.heatmap`）——Prism 没有的能力。

---

## 10. Interpolate a Standard Curve（标准曲线插值）

### 10.1 用处
- 用已知浓度的标准品建立"响应 → 浓度"映射，**反算未知样本的浓度**。这是 ELISA、蛋白定量、激素检测等定量实验的终点步骤。

### 10.2 Prism 参数配置
- **选择拟合模型**：直线、二次/三次多项式、4PL、5PL、Spline、LOWESS（Prism 对免疫测定默认推荐 4PL/5PL）；
- 是否 log 变换 X（浓度跨度大时必须）；
- 权重（1/Y、1/Y² 常用）；
- 复孔：先平均响应再插值 vs 逐点插值后平均；
- 剔除坏标准点；
- **输出：插值浓度 + 95% CI**；超出标准范围的样本标记为 "extrapolated"（外推不可靠警告）。

### 10.3 真实实例
1. **ELISA 测细胞因子**：标准品 8 个浓度梯度（倍比稀释），样品 OD 落在标准曲线范围内 → 反算 pg/mL；超出最高标准的样品需稀释重测。
2. BCA/Bradford 蛋白定量。
3. 激素（皮质醇、胰岛素）化学发光法定量。

### 10.4 实现逻辑
1. 拟合标准曲线（同 §1 流程）；
2. 反插值：给定 Y₀ 解 f(X)=Y₀（单调段用二分法/Brent；S 形曲线注意可能有双解，取合理分支）；
3. CI：由拟合参数协方差经 delta 法传播，或 bootstrap 整条标准曲线；
4. QC 规则：标准点 R²、回算偏差（back-calculated recovery 80–120%）、范围外标记。

### 10.5 Python 落地方案
```python
fit = four_pl_model.fit(std_y, x=np.log10(std_conc), params=p0)
from scipy.optimize import brentq
def inv(y0):
    return 10**brentq(lambda lx: fit.eval(x=lx) - y0, lo, hi)
conc = [inv(y) for y in sample_y]
# CI：对 (std_conc, std_y) 做 1000 次 bootstrap 重拟合，取分位数
```
AI 增值点：自动画出标准曲线 + 样品落点图，标出超范围样本并生成稀释重测建议。

---

# 第二部分 Column Analyses

列结构：每列 = 一个组（如对照/处理），每行 = 一个实验单元。分析目标：**组间比较**。

---

## 11. t tests（含非参数对应）

### 11.1 用处
比较两组（或一组对理论值）的集中趋势是否有显著差异，是生物医学最高频的假设检验。

### 11.2 Prism 参数配置（对话框逐层还原）
**(a) Experimental design（实验设计）**——决定一切：
| 选项 | 含义 | 参数法 | 非参数法 |
|---|---|---|---|
| Unpaired（非配对） | 两组独立样本 | 非配对 t | Mann-Whitney |
| └ Assume equal variances? = No | 方差不齐 | **Welch t** | — |
| Paired（配对） | 同一单元前后/同窝匹配 | 配对 t | Wilcoxon 符号秩 |
| One sample vs value | 单组对理论值 | one-sample t | Wilcoxon vs value |

**(b) Assume Gaussian distribution?（是否假设正态）**
- Yes → 参数检验；No → 非参数；
- Prism 10 有 Auto：按组做正态性检验自动建议（**但小样本时正态性检验功效低，此选项需谨慎解读**）。

**(c) Options**
- 单尾 / 双尾（single vs two-tailed）；
- 置信水平（默认 95%）；
- Mann-Whitney/Wilcoxon 细节：精确 P（小样本）vs 高斯近似（大样本，Prism 按 n 自动）；有结（ties）时的处理；
- 输出：差值均值 ± CI（配对）、中位数差、**Hodges-Lehmann 估计及 CI**（非参数）、描述统计。

**(d) Graphing options**
- 散点+误差线（Mean±SD / Mean±SEM / 95%CI）、箱线图、小提琴图；
- 配对数据必须画**连线图**（每对一条线，直观展示方向一致性）。

### 11.3 真实实例
1. **非配对**：对照组 vs 给药组小鼠肿瘤体积（n=10/组）。若两组 SD 差异大 → Welch。
2. **配对**：12 名高血压患者服药前后的收缩压。配对消除个体间变异，功效更高——**设计是配对的却用了非配对 t 是常见错误**，AI 应检测。
3. **单样本**：归一化到对照=100% 的处理组相对活性，检验是否 ≠100%。
4. **非参数**：疼痛评分（有序等级）、偏态的细胞因子浓度 → Mann-Whitney。

### 11.4 实现逻辑（决策流）
```
配对? ──是──> 正态(差值)? ──是──> paired t ──否──> Wilcoxon signed-rank
  │否
两组正态? ──否──> Mann-Whitney
  │是
方差齐(Levene)? ──是──> Student t ──否──> Welch t
```
输出统一对象：统计量、df、P、效应量（Cohen's d / rank-biserial）、均值差及 CI。

### 11.5 Python 落地方案
```python
from scipy import stats
# Welch（推荐默认）
t, p = stats.ttest_ind(a, b, equal_var=False, alternative='two-sided')
t, p = stats.ttest_rel(post, pre)
u, p = stats.mannwhitneyu(a, b, alternative='two-sided', method='exact')  # 小样本精确
w, p = stats.wilcoxon(post - pre, alternative='two-sided')
```
**强烈建议主引擎用 `pingouin`**（一个函数返回 t、df、p、CI、cohen-d、BF10、power，接近 Prism+ 的输出）：
```python
import pingouin as pg
pg.ttest(a, b, paired=False, correction=True)   # correction=True 即 Welch
```
- HL 估计与 CI：Mann-Whitney 的所有跨组差值的中位数 + bootstrap CI；
- 正态性预检：`stats.shapiro`（n<50）/ `stats.normaltest`（n≥50）；方差齐：`stats.levene`（Brown-Forsythe 变体 center='median'）。

---

## 12. One-way ANOVA（含非参数）

### 12.1 用处
三组及以上均值比较。直接用多个 t 检验会膨胀假阳性（k 组有 k(k−1)/2 对比较），ANOVA 先做整体 F 检验，再做受控的多重比较。

### 12.2 Prism 参数配置
**(a) Experimental design**
- None（独立样本）vs Matched（重复测量/随机区组：同一单元多次测量）；
**(b) Assume Gaussian?**
- Yes + 方差齐 → 经典 one-way ANOVA；
- Yes + 方差不齐 → **Welch ANOVA**；
- No + 独立 → **Brown-Forsythe 检验**（Prism 9+ 的选择，比 Kruskal-Wallis 对偏态更稳健的替代？——注意：Prism 对非高斯独立组提供 Brown-Forsythe；Kruskal-Wallis 也在列可选）；
- No + 重复测量 → **Friedman 检验**。
**(c) Assume equal variances?**：独立设计下的 Welch / Brown-Forsythe 分支开关。
**(d) Multiple comparisons（核心选项卡）**
- 比较类型：
  1. 所有组两两比较；
  2. 每列 vs 一个指定对照组；
  3. 每列均值 vs 理论值；
  4. （RM）组内特定时点比较；
- 方法选择：
  | 场景 | 方法 |
  |---|---|
  | 两两比较 | **Tukey**（最常用）、Fisher LSD、Bonferroni、Holm-Sidak、Newman-Keuls |
  | vs 对照 | **Dunnett** |
  | Kruskal-Wallis 后 | **Dunn**（带校正） |
  | Friedman 后 | Dunn（配对版） |
- 输出：每对比较的均值差、95% CI、调整后 P、显著性标记。
**(e) 附加输出**：F、df、P、R²（组间方差占比）；RM 设计下的变异分解（个体间 vs 残差）。

### 12.3 真实实例
1. 溶剂对照 / 低 / 中 / 高剂量四组小鼠体重变化 → ANOVA + Tukey。
2. 同一批细胞在 0/6/12/24h 测分泌量（重复测量）→ RM ANOVA；若时间点少可用配对比较+FDR。
3. 三种保存条件下蛋白降解率，方差不齐 → Welch ANOVA + Games-Howell 型事后比较。
4.  ordinal 病理评分多组比较 → Kruskal-Wallis + Dunn。

### 12.4 实现逻辑
F = 组间均方/组内均方；RM 设计剔除个体间变异（区组）提高功效；Welch 用加权均方与调整 df；事后检验 = 成对检验 + 多重校正（Tukey 用学生化极差分布，Dunnett 用多元 t 分布，Dunn 对秩做 z 检验后 BH/Bonferroni 校正）。

### 12.5 Python 落地方案
```python
from scipy.stats import f_oneway, kruskal, friedmanchisquare
F, p = f_oneway(g1, g2, g3)
import pingouin as pg
pg.welch_anova(data=df, dv='y', between='group')        # Welch ANOVA
pg.rm_anova(data=df, dv='y', within='time', subject='id')
from statsmodels.stats.multicomp import pairwise_tukeyhsd
pairwise_tukeyhsd(df['y'], df['group'], alpha=0.05)
import scikit_posthocs as sp
sp.posthoc_dunn(df, val_col='y', group_col='group', p_adjust='bonferroni')
```
- Dunnett：`statsmodels.stats.multicomp.dunnett`（较新版本）或 `scipy.stats.dunnett`（SciPy ≥1.11 已内置！）；
- 图形：组均值+误差线 / 箱线图 + 显著性星号标注（可用 `statannotations` 包自动加星）。

---

## 13. One-sample t and Wilcoxon test

### 13.1 用处
检验一列数据与**理论值**（通常是 100%、1.0、0）的差异。归一化实验的标配：数据除/除以对照归一化后，对照组理论值=100% 或 1。

### 13.2 Prism 参数配置
- 理论值输入；单/双尾；正态性决定 t vs Wilcoxon（对差值 x−value 做符号秩）。

### 13.3 真实实例
1. 处理组细胞活力归一化到对照=100% 后，检验是否低于 100%；
2. log2(fold change) 检验是否 ≠ 0（fold change ≠ 1）；
3. 测量系统偏倚：标准物质测定值 vs 认证值。

### 13.4 Python
```python
stats.ttest_1samp(x, popmean=100, alternative='two-sided')
stats.wilcoxon(x - 100)   # 等价对差值做符号秩
```

---

## 14. Descriptive Statistics（描述统计）

### 14.1 用处
一切分析的第一步与报告基础：刻画分布位置、离散度、形状。

### 14.2 Prism 参数配置（勾选清单）
Mean、SD、SEM、Mean 的 95% CI、%CV、Median、25/75 分位数、Min、Max、Range、Geometric mean（滴度/对数正态数据必用）、Harmonic mean、Skewness、Kurtosis；缺失值处理策略。

### 14.3 真实实例
临床试验 Table 1（基线特征表）、任何论文的"数据以 mean±SD 表示"。

### 14.4 Python
```python
desc = df.agg(['count','mean','std','median','min','max'])
from scipy.stats import sem, gmean, skew, kurtosis
ci = pg.compute_bootci(x, func='mean')   # 或 t 分布 CI: mean ± t*SEM
```
建议：输出统一 schema（JSON），供 AI 报告层直接引用。

---

## 15. Normality and Lognormality Tests（正态性 / 对数正态性检验）

### 15.1 用处
为参数/非参数路线选择提供证据；识别对数正态数据（浓度、滴度、潜伏期），提示用几何均数与 log 变换。

### 15.2 Prism 参数配置
对每列同时跑多个检验（可用性按 n 自动过滤）：
| 检验 | 适用 n | 特点 |
|---|---|---|
| D'Agostino-Pearson omnibus | n≥8（Prism 要求 n≥20 左右才可靠） | 偏度+峰度组合 |
| Shapiro-Wilk | 3≤n≤5000 | 小样本首选，功效最高 |
| Kolmogorov-Smirnov (Lilliefors) | 大样本 | 保守 |
| Anderson-Darling | 各 n | 对尾部敏感 |
- **Lognormality**：对 log(x) 重复上述检验；
- 输出：每检验 P 值 + α=0.05 下的 pass/fail 结论。

### 15.3 重要 caveat（写进 AI 解读层）
- n 很小时正态性检验**没功效**（检不出非正态），n 很大时又过于敏感（微小偏离也显著）——所以 Prism 文档也建议结合图形（直方图/QQ 图）与领域知识；
- t 检验/ANOVA 对轻度偏离正态稳健（n≥每组 8–10 时），真正致命的是**方差不齐+样本不等**。

### 15.4 真实实例
抗体滴度、血药浓度、环境污染物浓度 → 常对数正态 → log 变换后参数分析，报告几何均数。

### 15.5 Python
```python
stats.shapiro(x); stats.normaltest(x); stats.anderson(x, dist='norm')
stats.kstest(np.log(x), 'norm', args=(np.mean(np.log(x)), np.std(np.log(x))))
# QQ 图
import matplotlib.pyplot as plt; stats.probplot(x, plot=plt)
```

---

## 16. Frequency Distribution（频数分布）

### 16.1 用处
把原始值聚合成直方图：看分布形态（单峰/双峰/偏态）、定义阈值（如阳性 cutoff）、为卡方检验分组。

### 16.2 Prism 参数配置
- Bin 设置：自动（Prism 按数据范围选）/ 固定 bin 宽度 / 指定起止与宽度；
- 输出：每 bin 计数、相对频率（%）、累积频率；
- 是否叠加理论正态曲线对比。

### 16.3 真实实例
1. 流式细胞术细胞大小/荧光强度分布（常双峰→设门）；
2. 患者年龄分布；
3. 检验结果的参考区间建立（2.5–97.5 分位）。

### 16.4 Python
```python
counts, edges = np.histogram(x, bins='auto')   # 或 bins=np.arange(start, stop, width)
import seaborn as sns; sns.histplot(x, binwidth=w, kde=False)
```

---

## 17. ROC Curve

### 17.1 用处
评估一个连续指标**区分两类样本**（病例/对照）的能力：曲线下面积 AUC 与随机猜测（0.5）比较；选择最佳诊断阈值。

### 17.2 Prism 参数配置
- 数据组织：一列连续检测值 + 分组标签（两列各一组也可）；
- **方向设定**：值升高=阳性 or 降低=阳性；
- 输出：ROC 曲线（灵敏度 vs 1−特异度，全阈值扫描）、**AUC ± 95% CI**、P（H₀: AUC=0.5，本质与 Mann-Whitney U 等价）、可选：指定阈值下的灵敏度/特异度表、Youden 指数最优阈值；
- 比较：两条 ROC 的 AUC 比较（如两个生物标志物谁更好）。

### 17.3 真实实例
1. 新型炎症标志物诊断脓毒症：AUC=0.87 (95%CI 0.81–0.93)；
2. ELISA OD 值作为血清学阳性判定：选 Youden 最优 cutoff；
3. PSA 不同 cutoff 的灵敏度/特异度权衡。

### 17.4 实现逻辑
阈值从大到小扫描 → 每阈值的 TPR/FPR → 梯形积分 AUC；CI 常用 DeLong 法（非参数，基于秩）或 bootstrap；Youden J = max(灵敏度+特异度−1)。

### 17.5 Python 落地方案
```python
from sklearn.metrics import roc_curve, roc_auc_score
fpr, tpr, thr = roc_curve(y_true, score)
auc = roc_auc_score(y_true, score)
idx = np.argmax(tpr - fpr); best_thr = thr[idx]     # Youden
# CI：DeLong（自行实现或用现成代码）或 bootstrap 2000 次
```
- 两条 ROC 比较：DeLong 检验（可引用 sunhongbao/pROC 思路的开源实现）；
- AI 增值：自动生成"该标志物诊断价值中等(AUC 0.7-0.8)，建议联合指标"式解读。

---

## 18. Bland-Altman Method Comparison（方法一致性比较）

### 18.1 用处
回答"两种方法能否互换"：不是相关好就行（相关只说明共变），要看**绝对一致性与偏倚大小**。

### 18.2 Prism 参数配置
- 输入：成对测量（方法 A 列 vs 方法 B 列，一行一样本）；
- 图类型：差值 vs 均值（经典）/ 比值 vs 均值 / 百分差 vs 均值（差异与量级成比例时用比值/log）；
- 输出：**偏倚 bias（差值均值）**、差值 SD、**一致性界限 LoA = bias ± 1.96×SD**、bias 与 LoA 的 95% CI、偏倚是否显著（配对 t）、**比例偏倚**检验（差值对均值回归斜率是否≠0）。

### 18.3 真实实例
1. 腕式电子血压计 vs 汞柱听诊法；
2. 指尖血糖仪 vs 静脉生化血糖；
3. RNA-seq 与 NanoString 的基因表达定量（log 尺度 B-A）。

### 18.4 判定逻辑
LoA 的宽度是否**临床可接受**需要领域判断（统计只给数字）——AI 解读层必须提示这一点，不能自动下"一致"结论。

### 18.5 Python 落地方案
```python
d = a - b; m = (a + b)/2
bias, sd = d.mean(), d.std(ddof=1)
loa = (bias - 1.96*sd, bias + 1.96*sd)
# LoA 的 CI（Altman 公式）: bias ± t*sd/√n; LoA ≈ bias±1.96sd ± t*sd*√(1/n+1.96²/(2(n-1)))
plt.scatter(m, d); plt.axhline(bias); plt.axhline(loa[0]); plt.axhline(loa[1])
```
可用 `pyCompare` 包，但建议自实现（逻辑简单且可定制 CI）。

---

## 19. Identify Outliers（离群值识别）

### 19.1 用处
数据清洗：识别可能由技术错误（加样、气泡、污染）产生的极端值。Prism 强调：**剔除必须有实验依据，不能仅因统计上异常就删**。

### 19.2 Prism 参数配置（方法选择是核心）
| 方法 | 原理 | 适用 |
|---|---|---|
| **ROUT (Q=1%)** | 拟合模型后对残差做 FDR 控制的多重检验 | 配合非线性拟合，最严谨 |
| **Grubbs 检验** | 假设正态，逐个检验最极端值 | 单列、近似正态、一次找一个 |
| **IQR 规则** | 超出 [Q1−1.5×IQR, Q3+1.5×IQR] | 不要求正态，简单稳健 |
| 范围外剔除 | 超出指定上下限 | 有物理边界的数据 |
- 作用范围：逐列独立 vs 整个数据集；
- 选项：标记 vs 直接剔除；剔除后是否自动重分析。

### 19.3 真实实例
1. ELISA 复孔间一个孔明显气泡 → OD 离群 → IQR/ROUT 剔除；
2. 行为学实验中一只小鼠因设备故障数据异常 → Grubbs 标记后人工确认；
3. 细胞实验中污染孔。

### 19.4 实现逻辑
- Grubbs：G = max|x−x̄|/s，临界值来自 t 分布：t² = …，迭代（每次删一个重算）；
- ROUT：基于拟合残差的 Q 值 + BH-FDR 程序；
- **输出必须包含审计记录**（哪个值、什么原因、删前删后结果对比）——这是 GLP/审稿合规要求。

### 19.5 Python 落地方案
```python
q1, q3 = np.percentile(x, [25, 75]); iqr = q3-q1
fence = (q1-1.5*iqr, q3+1.5*iqr)          # IQR 法
# Grubbs：自实现 ~20 行（查 t 临界值迭代）；或用 PyPI `outlier-utils`
```
AI 增值：剔除前后自动对比报告（P 值是否翻转），翻转时必须高亮警告。

---

## 20. Analyze a Stack of P values（P 值堆多重校正）

### 20.1 用处
当你对 N 个指标/基因/时间点**各做一次检验**，得到一列 P 值时，直接按 0.05 判断会大量假阳性（N=20 时平均 1 个假阳性）。此功能做**多重比较校正**。

### 20.2 Prism 参数配置
- 输入：每行一个 P 值（可带标签）；
- **校正方法**：
  | 方法 | 控制对象 | 特点 |
  |---|---|---|
  | Bonferroni | FWER | 最保守，n×P |
  | Holm-Sidak / Holm-Bonferroni | FWER | 比 Bonferroni 更有功效 |
  | **Benjamini-Hochberg** | **FDR** | 组学标配，输出 q 值 |
  | Benjamini-Yekutieli | FDR（任意相关） | 更保守 |
- α 阈值；输出：校正前后显著性对照表、q 值。

### 20.3 真实实例
1. 转录组差异表达：20000 基因的 P → BH 校正，q<0.05 为显著；
2. 临床试验 12 个次要终点 → Holm 校正；
3. 多脑区/多时间点的重复测量分别做 t 检验 → FDR。

### 20.4 Python 落地方案
```python
from statsmodels.stats.multitest import multipletests
reject, p_adj, _, _ = multipletests(pvals, alpha=0.05, method='fdr_bh')
# method 可选: 'bonferroni','holm','hs','fdr_bh','fdr_by'
```
配合上游：循环对每列/每行跑 t 检验收集 P（向量化：`scipy.stats.ttest_ind(a_mat, b_mat, axis=1)` 一次算 N 组）。

---

# 第三部分 通用图形选项映射（Graphing options）

Prism 图形体系 → Python 复刻方案：

| Prism 图形 | 适用分析 | Python 实现 |
|---|---|---|
| Scatter + Mean±SD/SEM/95%CI 误差线 | t/ANOVA | seaborn `errorbar`/`pointplot` |
| Box and whiskers（min–max / quartile 多种样式） | 非参数、分布 | seaborn `boxplot(whis=...)` |
| Violin | 分布形态 | seaborn `violinplot` |
| Paired/connected 图 | 配对设计 | 逐对 `plt.plot` 连线 + 端点 |
| 拟合曲线 + 置信带 | 回归 | `fill_between` |
| ROC 曲线 / B-A 图 | 各自分析 | matplotlib 自绘 |
| 直方图 | 频数 | `sns.histplot` |
| 显著性星号标注 | 所有组间比较 | `statannotations` 包 |

风格复刻要点：Prism 默认白底黑轴、粗 1.5pt 轴、无网格、符号+误差线风格——用一套 matplotlib rcParams 主题即可统一。

---

# 第四部分 AI 驱动 Python 的整体实现架构

## 4.1 核心洞察
Prism 的护城河不是算法（都有现成库），而是三件事：
1. **对话框即决策树**：把统计选择降维成几个问题；
2. **防呆**：预检（正态/方差齐）引导正确方法；
3. **出版级一键出图**。
AI 要复刻/超越的就是这三层，而不是重写统计函数。

## 4.2 分层架构

```
┌─ L1 数据接入 ── Excel/CSV → 识别表类型（Column/XY/Grouped）→ DataFrame + 元数据
├─ L2 数据画像 ── 每组: n、缺失、正态性、方差齐、配对结构、值域 → Profile JSON
├─ L3 决策引擎 ── LLM 理解用户意图 + 规则硬约束 → AnalysisConfig（pydantic schema）
├─ L4 执行引擎 ── 每个功能 = f(config) → Result（统计量/P/CI/效应量/诊断）
├─ L5 图形引擎 ── config 驱动 seaborn/matplotlib，Prism 风格主题
├─ L6 解读层 ── LLM 生成：结果解读 + 方法学段落 + APA 式报告 + 风险警告
└─ L7 审计层 ── 全程记录：软件版本、随机种子、剔除记录、决策依据
```

## 4.3 Config Schema 示例（镜像 Prism 对话框）

```python
class TTestConfig(BaseModel):
    design: Literal['unpaired','paired','one_sample']
    theoretical_value: float | None = None        # one_sample 时必填
    equal_var: bool | Literal['auto'] = 'auto'    # auto → Levene 判定
    gaussian: Literal['assume','reject','auto'] = 'auto'  # auto → 正态性预检
    tail: Literal['two-sided','greater','less'] = 'two-sided'
    ci: float = 0.95
    exact_nonparametric: bool | Literal['auto'] = 'auto'  # 小样本精确P
    effect_size: bool = True                      # Cohen's d / HL（超越Prism）
    graph: Literal['scatter_errorbar','box','violin','paired_lines']

class CurveFitConfig(BaseModel):
    model: str                     # 模型库 id，如 'dose_response_4pl'
    constraints: dict              # {'hill': {'min':0.2,'max':5}}
    share_params: list[str]
    weighting: Literal['equal','1/y','1/y2','y','y2'] = 'equal'
    robust: bool = False
    compare_models: list[str] = [] # F-test/AICc 候选
```

## 4.4 决策引擎的规则 + AI 混合策略
- **硬规则（代码写死，不让 LLM 拍板）**：
  - 配对设计 → 必须配对检验；
  - 组数≥3 → 禁止裸 t 检验两两比较；
  - 正态性拒绝 + n 小 → 非参数；
  - 归一化数据（对照=100%）→ one-sample 检验。
- **LLM 负责**：自然语言意图解析（"比较这两组"→ 识别列）、模型族推荐（根据数据形状+领域）、异常提醒（"你的 n=4，检验功效很低"）、结果解读。
- 每个决策记录理由，用户可覆盖（覆盖也记录）。

## 4.5 超越 Prism 的差异化
1. **结果解读**：Prism 只给数字，AI 给"结论 + 局限 + 下一步实验建议"；
2. **错误拦截**：检测常见误用（3 组用 t 检验、配对当非配对、n<3 做统计）；
3. **全流程**：清洗 → QC（行 CV）→ 分析 → 出版图 → 方法学中文/英文段落；
4. **高通量编排**：stack of P / 多基因批量分析的原生支持。

## 4.6 落地路线图
| 阶段 | 内容 | 产出 |
|---|---|---|
| P0（1 周） | scipy/pingouin/lmfit 跑通全部 20 个功能的最小示例，对照 Prism 官方示例数据验证数值 | 算法基线 + 对照测试集 |
| P1（2 周） | Config schema + 决策引擎 + Streamlit 界面：上传数据→画像→推荐→执行→图 | 可演示原型 |
| P2（2 周） | LLM 解读层 + 报告生成（markdown/HTML/Word）+ 审计日志 | Beta |
| P3 | 批量分析、模型库扩充（80+ 方程）、Prism 文件(.pzfx)导入 | 产品化 |

## 4.7 关键库清单
| 职责 | 库 |
|---|---|
| 统计检验主引擎 | **pingouin**（效应量/BF/power）、scipy.stats |
| 多重比较 | statsmodels.multitest、scikit-posthocs（Dunn） |
| ANOVA 族 | scipy、pingouin、statsmodels |
| 曲线拟合 | **lmfit**（首选）、scipy.optimize/odr |
| ROC | scikit-learn + DeLong 自实现 |
| 绘图 | matplotlib + seaborn + statannotations |
| Schema/校验 | pydantic |
| 界面 | Streamlit / Gradio |
