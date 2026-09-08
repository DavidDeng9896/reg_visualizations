"""XY 分析 #1：非线性回归（曲线拟合）——旗舰页，完整还原 Prism 对话框。"""
import dash
import numpy as np
import plotly.graph_objects as go
from lmfit import Model
from scipy.stats import t
from statsmodels.stats.multitest import multipletests

from framework.controls import build_controls  # noqa: F401
from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, ci_band, PALETTE
from framework import stats_html as sh
from framework.utils import fmt, fmt_p, ci_text

PAGE_ID = "xy-nonlinear"
dash.register_page(__name__, path="/xy/nonlinear", title="非线性回归", name="非线性回归")

# ---------------------------------------------------------------- 模型库
def _four_pl(x, Bottom, Top, LogEC50, Hill):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill))

def _five_pl(x, Bottom, Top, LogEC50, Hill, S):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill)) ** S

def _mm(x, Vmax, Km):
    return Vmax * x / (Km + x)

def _linear(x, a, b):
    return a + b * x

def _exp_decay(x, Y0, k, Plateau):
    return Plateau + (Y0 - Plateau) * np.exp(-k * x)

def _exp_2decay(x, Y0, k1, k2, Plateau):
    return Plateau + (Y0 - Plateau) * (0.6 * np.exp(-k1 * x) + 0.4 * np.exp(-k2 * x))

MODELS = {
    "four_pl": Model(_four_pl),
    "three_pl": Model(_four_pl),
    "five_pl": Model(_five_pl),
    "mm": Model(_mm),
    "linear": Model(_linear),
    "exp_decay": Model(_exp_decay),
    "exp_2decay": Model(_exp_2decay),
}
LABELS = {
    "four_pl": "4PL（log(激动剂) vs 响应）",
    "three_pl": "3PL（Hill 固定=1）",
    "five_pl": "5PL（非对称）",
    "mm": "Michaelis-Menten",
    "linear": "线性",
    "exp_decay": "单相指数衰减",
    "exp_2decay": "双相指数衰减",
}
DATA_MODELS = {
    "four_pl": ("四参数剂量-反应", "log₁₀[浓度]"),
    "mm": ("Michaelis-Menten", "底物浓度"),
    "exp_decay": ("单相指数衰减", "时间"),
}
DATA2FIT = {"four_pl": "four_pl", "mm": "mm", "exp_decay": "exp_decay"}
COMPARE = {
    "four_pl": ["four_pl", "three_pl", "five_pl"],
    "mm": ["mm", "linear", "four_pl"],
    "exp_decay": ["exp_decay", "exp_2decay", "linear"],
}

# ---------------------------------------------------------------- 控件
CONTROLS = [
    {"type": "group", "title": "数据生成（Prism 数据表）"},
    {"type": "select", "id": "data_model", "label": "数据模型",
     "options": [{"label": "四参数剂量-反应 (4PL)", "value": "four_pl"},
                 {"label": "Michaelis-Menten 酶动力学", "value": "mm"},
                 {"label": "单相指数衰减", "value": "exp_decay"}],
     "value": "four_pl", "data_param": True},
    {"type": "slider", "id": "n_points", "label": "浓度/时间点数", "min": 5, "max": 15,
     "value": 9, "data_param": True},
    {"type": "slider", "id": "reps", "label": "每点复孔数", "min": 1, "max": 5,
     "value": 3, "data_param": True},
    {"type": "slider", "id": "noise", "label": "噪声 (SD, 占跨度比例)", "min": 0.01, "max": 0.25,
     "step": 0.005, "value": 0.04, "data_param": True},
    {"type": "checkbox", "id": "inject_outlier", "label": "注入一个离群点",
     "value": False, "data_param": True,
     "help": "在数据里故意放一个异常点，用来演示 ROUT 离群点剔除。"},
    {"type": "group", "title": "数据真实参数（4PL）"},
    {"type": "slider", "id": "bottom_true", "label": "Bottom（下平台）", "min": 0, "max": 40,
     "value": 10, "data_param": True},
    {"type": "slider", "id": "top_true", "label": "Top（上平台）", "min": 60, "max": 120,
     "value": 100, "data_param": True},
    {"type": "slider", "id": "logec50_true", "label": "LogEC50", "min": -1.5, "max": 1.5,
     "step": 0.05, "value": 0.0, "data_param": True},
    {"type": "slider", "id": "hill_true", "label": "Hill 斜率", "min": 0.3, "max": 3.0,
     "step": 0.05, "value": 1.0, "data_param": True},
    {"type": "group", "title": "数据真实参数（MM / 指数衰减）"},
    {"type": "slider", "id": "vmax_true", "label": "Vmax（MM）", "min": 20, "max": 150,
     "value": 100, "data_param": True},
    {"type": "slider", "id": "km_true", "label": "Km（MM）", "min": 0.5, "max": 10,
     "step": 0.1, "value": 3.0, "data_param": True},
    {"type": "slider", "id": "y0_true", "label": "Y0（衰减起始值）", "min": 20, "max": 120,
     "value": 80, "data_param": True},
    {"type": "slider", "id": "k_true", "label": "k（衰减速率）", "min": 0.05, "max": 2.0,
     "step": 0.05, "value": 0.3, "data_param": True},
    {"type": "slider", "id": "plateau_true", "label": "平台值（衰减末）", "min": 0, "max": 30,
     "value": 5, "data_param": True},
    {"type": "group", "title": "Model 选项卡（拟合方程）"},
    {"type": "select", "id": "fit_model", "label": "拟合模型",
     "options": [{"label": "自动（与数据模型一致）", "value": "auto"},
                 {"label": "4PL", "value": "four_pl"},
                 {"label": "3PL（Hill=1）", "value": "three_pl"},
                 {"label": "5PL（非对称）", "value": "five_pl"},
                 {"label": "Michaelis-Menten", "value": "mm"},
                 {"label": "线性", "value": "linear"},
                 {"label": "单相指数衰减", "value": "exp_decay"},
                 {"label": "双相指数衰减", "value": "exp_2decay"}],
     "value": "auto"},
    {"type": "group", "title": "Parameters 选项卡（约束）"},
    {"type": "checkbox", "id": "bottom_ge0", "label": "约束：Bottom ≥ 0",
     "help": "平台值不能低于 0（如存活率/结合百分数）。"},
    {"type": "select", "id": "hill_constraint", "label": "Hill 约束",
     "options": [{"label": "不约束", "value": "none"},
                 {"label": "固定为 1（单位点结合）", "value": "fixed1"},
                 {"label": "限制在 [0.2, 5]", "value": "range"}],
     "value": "none"},
    {"type": "checkbox", "id": "top_le", "label": "约束：Top ≤ 1.5 × 数据最大值",
     "help": "上平台不能超出合理范围，防止过冲。"},
    {"type": "group", "title": "Fit 选项卡（权重与稳健）"},
    {"type": "select", "id": "weighting", "label": "权重",
     "options": [{"label": "Equal（等权重）", "value": "equal"},
                 {"label": "1/Y", "value": "1/y"},
                 {"label": "1/Y²（SD∝Y，恒定的CV）", "value": "1/y2"},
                 {"label": "Y", "value": "y"},
                 {"label": "Y²", "value": "y2"}],
     "value": "equal",
     "help": "处理异方差：响应值越大误差越大时（如 ELISA），用 1/Y² 加权。"},
    {"type": "checkbox", "id": "robust", "label": "稳健回归（双权重 bisquare）",
     "help": "抗离群点：用 soft_l1 损失替代最小二乘。"},
    {"type": "checkbox", "id": "rout", "label": "ROUT 离群点剔除 (FDR)",
     "help": "拟合后按学生化残差做 FDR 控制（简化版），剔除离群点后重拟合。"},
    {"type": "slider", "id": "q", "label": "ROUT Q 值", "min": 0.01, "max": 0.2,
     "step": 0.005, "value": 0.05},
    {"type": "group", "title": "输出"},
    {"type": "checkbox", "id": "show_residuals", "label": "显示残差子图"},
    {"type": "checkbox", "id": "compare_models", "label": "模型比较（AICc 表）",
     "value": True},
]

FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"

# ---------------------------------------------------------------- 数据生成
def generate_data(p):
    rng = np.random.default_rng(42)
    dm = p["data_model"]
    n = p["n_points"]; reps = p["reps"]
    if dm == "four_pl":
        x = np.linspace(-2.0, 2.0, n)
        ybar = _four_pl(x, p["bottom_true"], p["top_true"], p["logec50_true"], p["hill_true"])
        span = p["top_true"] - p["bottom_true"]
        xlabel = "log₁₀[浓度]"
    elif dm == "mm":
        x = np.geomspace(0.3, 30, n)
        ybar = _mm(x, p["vmax_true"], p["km_true"])
        span = p["vmax_true"]
        xlabel = "底物浓度 [S]"
    else:
        x = np.linspace(0.5, 20, n)
        ybar = _exp_decay(x, p["y0_true"], p["k_true"], p["plateau_true"])
        span = max(abs(p["y0_true"] - p["plateau_true"]), 1e-6)
        xlabel = "时间"
    sd = p["noise"] * span * 2  # 覆盖两个方向
    y = []
    for xi, mu in zip(x, ybar):
        y.extend(rng.normal(mu, sd, reps))
    y = np.array(y)
    x_all = np.repeat(x, reps)
    outlier = None
    if p.get("inject_outlier") and len(y) > 4:
        i = rng.integers(2, len(y) - 1)
        y[i] += rng.normal(span * 1.4, span * 0.3)
        outlier = int(i)
    return {
        "x": x_all.tolist(), "y": y, "x_unique": x.tolist(),
        "y_mean": [float(np.mean(y[x_all == xi])) for xi in x],
        "y_sem": [float(np.std(y[x_all == xi], ddof=1) / max(np.sqrt((x_all == xi).sum()), 1e-9)) for xi in x],
        "data_model": dm, "outlier": outlier, "xlabel": xlabel,
    }

# ---------------------------------------------------------------- 拟合工具
def _guess_params(model, name, x, y):
    p = model.make_params()
    ymin, ymax = float(np.min(y)), float(np.max(y))
    if name in ("four_pl", "five_pl", "three_pl"):
        p["Bottom"].set(value=ymin); p["Top"].set(value=ymax)
        p["LogEC50"].set(value=float(np.median(x))); p["Hill"].set(value=1.0)
        if name == "five_pl":
            p["S"].set(value=1.0)
        if name == "three_pl":
            p["Hill"].set(value=1.0, vary=False)
    elif name == "mm":
        p["Vmax"].set(value=ymax); p["Km"].set(value=float(np.median(x)))
    elif name == "linear":
        if len(x) > 1 and x[-1] != x[0]:
            p["b"].set(value=(y[-1] - y[0]) / (x[-1] - x[0]))
        p["a"].set(value=ymin)
    elif name == "exp_decay":
        p["Y0"].set(value=ymax); p["Plateau"].set(value=ymin); p["k"].set(value=1.0)
    elif name == "exp_2decay":
        p["Y0"].set(value=ymax); p["Plateau"].set(value=ymin)
        p["k1"].set(value=2.0); p["k2"].set(value=0.2)
    return p


def _apply_constraints(p, prm):
    if prm.get("bottom_ge0") and "Bottom" in p:
        p["Bottom"].min = 0
    if prm.get("top_le") and "Top" in p:
        p["Top"].max = max(p["Top"].value * 1.5, 1e-9)
    hc = prm.get("hill_constraint", "none")
    if hc == "fixed1" and "Hill" in p:
        p["Hill"].set(value=1.0, vary=False)
    elif hc == "range" and "Hill" in p:
        p["Hill"].min, p["Hill"].max = 0.2, 5.0
    return p


def _weights(y, mode):
    a = np.clip(np.abs(y), 1e-9, None)
    return {"equal": np.ones_like(y), "1/y": 1.0 / a, "1/y2": 1.0 / a ** 2,
            "y": a, "y2": a ** 2}[mode]


def _fit(model, name, x, y, weights, robust):
    p = _guess_params(model, name, x, y)
    if robust:
        return model.fit(y, p, x=x, weights=weights, method="least_squares",
                         fit_kws={"loss": "soft_l1"})
    return model.fit(y, p, x=x, weights=weights)


def _rout(model, name, x, y, weights, Q):
    """简化版 ROUT：稳健拟合 → 学生化残差 → BH-FDR 控制离群点。"""
    try:
        r = _fit(model, name, x, y, weights, robust=True)
    except Exception:
        return np.zeros(len(y), dtype=bool)
    resid = y - r.eval(x=x)
    s = np.std(resid, ddof=max(len(r.var_names), 1))
    if s == 0:
        return np.zeros(len(y), dtype=bool)
    z = np.abs(resid) / s
    df = max(len(y) - len(r.var_names), 1)
    pvals = 2 * (1 - t.cdf(z, df))
    pvals = np.clip(pvals, 1e-15, 1.0)
    _, qvals, _, _ = multipletests(pvals, alpha=Q, method="fdr_bh")
    return qvals < Q


def _ci_95(par):
    if par.stderr is None:
        return (None, None)
    return (par.value - 1.96 * par.stderr, par.value + 1.96 * par.stderr)


def _aicc(res, n):
    """AICc = AIC + 2k(k+1)/(n-k-1)，lmfit 不直接提供。"""
    k = len(res.var_names)
    if n <= k + 1:
        return float("nan")
    return res.aic + 2 * k * (k + 1) / (n - k - 1)


def _pow10(x):
    """安全 10**x，防止 CI 上界溢出。"""
    try:
        return 10 ** x
    except (OverflowError, FloatingPointError):
        return float("inf")

# ---------------------------------------------------------------- 分析
def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    dm = data["data_model"]
    fit_name = p["fit_model"]
    if fit_name == "auto":
        fit_name = DATA2FIT[dm]
    model = MODELS[fit_name]
    weights = _weights(y, p["weighting"])

    mask = np.ones(len(y), dtype=bool)
    n_out = 0
    if p.get("rout"):
        out = _rout(model, fit_name, x, y, weights, p["q"])
        n_out = int(out.sum())
        mask = ~out

    try:
        pp = _apply_constraints(_guess_params(model, fit_name, x[mask], y[mask]), p)
        result = _fit(model, fit_name, x[mask], y[mask], weights[mask], p["robust"])
    except Exception as e:
        return _error_fig(p), sh.stats_card([sh.interp(f"⚠️ 拟合失败：{e}")])

    # ---- 绘图 ----
    xx = np.linspace(x.min(), x.max(), 300)
    yfit = result.eval(x=xx)
    xlabel = data.get("xlabel", "x")

    if p["show_residuals"]:
        fig = go.Figure()
        fig.add_trace(scatter_trace(
            data["x_unique"], data["y_mean"],
            error_y=data["y_sem"], name="均值 ± SEM", color=PALETTE[0],
            hovertemplate="%{x:.3g}<br>均值 %{y:.3g} ± %{customdata:.3g}<extra>复孔均值</extra>",
            customdata=data["y_sem"]))
        fig.add_trace(line_trace(xx, yfit, name="拟合曲线", color=PALETTE[1], width=3,
                                 hovertemplate="%{x:.3g}<br>%{y:.3g}<extra>拟合</extra>"))
        resid = y - result.eval(x=x)
        fig.add_trace(go.Scatter(x=x, y=resid, mode="markers", name="残差",
                                 marker=dict(color=PALETTE[2], size=6),
                                 xaxis="x2", yaxis="y2",
                                 hovertemplate="%{x:.3g}<br>残差 %{y:.3g}<extra></extra>"))
        fig.add_trace(go.Scatter(x=[x.min(), x.max()], y=[0, 0], mode="lines",
                                 line=dict(color="#999", dash="dash"), showlegend=False,
                                 xaxis="x2", yaxis="y2"))
        fig.update_layout(
            xaxis=dict(domain=[0, 1], title=xlabel),
            yaxis=dict(domain=[0.42, 1], title="Y 响应"),
            xaxis2=dict(domain=[0, 1], anchor="y2", title=xlabel),
            yaxis2=dict(domain=[0, 0.32], anchor="x2", title="残差"))
    else:
        fig = go.Figure()
        fig.add_trace(scatter_trace(
            data["x_unique"], data["y_mean"],
            error_y=data["y_sem"], name="均值 ± SEM", color=PALETTE[0],
            hovertemplate="%{x:.3g}<br>均值 %{y:.3g} ± %{customdata:.3g}<extra>复孔均值</extra>",
            customdata=data["y_sem"]))
        fig.add_trace(line_trace(xx, yfit, name="拟合曲线", color=PALETTE[1], width=3,
                                 hovertemplate="%{x:.3g}<br>%{y:.3g}<extra>拟合</extra>"))
        try:
            ci_band(fig, xx, result.eval_uncertainty(x=xx, sigma=2)[0],
                    result.eval_uncertainty(x=xx, sigma=2)[1])
        except Exception:
            pass

    if data.get("outlier") is not None:
        i = data["outlier"]
        fig.add_trace(go.Scatter(x=[x[i]], y=[y[i]], mode="markers",
                                 marker=dict(color="#E15759", size=11, symbol="x"),
                                 name="注入离群点", showlegend=False,
                                 hovertemplate="%{x:.3g}<br>%{y:.3g}<extra>离群点</extra>"))
    if n_out > 0 and p.get("rout"):
        fig.add_trace(go.Scatter(x=x[~mask], y=y[~mask], mode="markers",
                                 marker=dict(color="#E15759", size=13, symbol="circle-open",
                                             line=dict(width=2)),
                                 name=f"ROUT 剔除 ({n_out})", showlegend=False))

    # 标注关键参数
    notes = [f"{LABELS[fit_name]}"]
    if fit_name in ("four_pl", "three_pl", "five_pl"):
        top = result.params["Top"].value
        bot = result.params["Bottom"].value
        ic50 = _pow10(result.params["LogEC50"].value)
        notes.append(f"IC₅₀ = {ic50:.3g}")
        notes.append(f"Top = {top:.3g}, Bottom = {bot:.3g}")
        notes.append(f"LogEC₅₀ = {result.params['LogEC50'].value:.3g}")
        notes.append(f"Hill = {result.params['Hill'].value:.3g}")
    elif fit_name == "mm":
        notes.append(f"Vmax = {result.params['Vmax'].value:.3g}")
        notes.append(f"Km = {result.params['Km'].value:.3g}")
    elif fit_name in ("exp_decay", "exp_2decay"):
        k = result.params["k1" if fit_name == "exp_2decay" else "k"].value
        notes.append(f"k = {k:.3g}   t½ = {np.log(2) / k:.3g}")
        notes.append(f"Y0 = {result.params['Y0'].value:.3g}")
    notes.append(f"R² = {result.rsquared:.4f}   (n={len(y) - n_out})")
    if p["weighting"] != "equal":
        notes.append(f"权重 = {p['weighting']}")
    corner_note(fig, "\n".join(notes), fs=12.5)
    theme_fig(fig, height=560 if p["show_residuals"] else 520)

    # ---- 统计卡片 ----
    rows = []
    for pn in result.var_names:
        par = result.params[pn]
        lo, hi = _ci_95(par)
        rows.append((pn, fmt(par.value), fmt(par.stderr), ci_text(lo, hi) if lo is not None else "—"))
    import pandas as pd
    param_df = pd.DataFrame(rows, columns=["参数", "估计值", "SE", "95% CI"])

    n_fit = len(y) - n_out
    k = len(result.var_names)
    if n_fit > k + 1:
        adj_r2 = 1 - (1 - result.rsquared) * (n_fit - 1) / (n_fit - k - 1)
    else:
        adj_r2 = float("nan")
    goodness = [
        ("R²", fmt(result.rsquared)), ("调整 R²", fmt(adj_r2)),
        ("约化 χ²", fmt(result.redchi)), ("AICc", fmt(_aicc(result, n_fit))),
        ("BIC", fmt(result.bic)), ("RMSE", fmt(np.sqrt(result.chisqr / max(n_fit - k, 1)))),
        ("数据点 n", str(n_fit)),
    ]
    if n_out > 0:
        goodness.insert(0, ("ROUT 剔除", f"{n_out} 个点（Q={p['q']}）"))

    derived = []
    if fit_name in ("four_pl", "three_pl", "five_pl"):
        derived = [("IC₅₀ (10^LogEC50)", f"{10 ** result.params['LogEC50'].value:.3g}")]
    elif fit_name in ("exp_decay", "exp_2decay"):
        k = result.params["k1" if fit_name == "exp_2decay" else "k"].value
        derived = [("半衰期 t½ = ln2/k", f"{np.log(2) / k:.3g}")]

    children = [sh.stats_card([
        sh.section("拟合模型与设置", sh.kv_table([
            ("拟合模型", LABELS[fit_name]),
            ("数据模型", DATA_MODELS[dm][0]),
            ("权重方案", p["weighting"]),
            ("稳健回归", "是" if p["robust"] else "否"),
        ]), first=True),
        sh.section("参数估计（近似 95% CI）", sh.df_table(param_df)),
        sh.section("拟合优度", sh.kv_table(goodness)),
    ])]

    if derived:
        children[0].children.append(sh.section("派生参数", sh.kv_table(derived)))

    interp_txt = [f"拟合 {LABELS[fit_name]}：R² = {result.rsquared:.3f}"]
    if fit_name in ("four_pl", "three_pl", "five_pl"):
        ic50 = 10 ** result.params["LogEC50"].value
        lo, hi = _ci_95(result.params["LogEC50"])
        interp_txt.append(f"IC₅₀ = {ic50:.3g}" + (f"（95% CI {_pow10(hi):.3g} ~ {_pow10(lo):.3g}）" if lo is not None else ""))
    if n_out > 0:
        interp_txt.append(f"ROUT 检测并剔除了 {n_out} 个离群点（Q={p['q']}），重拟合完成。")

    if p.get("compare_models"):
        import pandas as pd
        comp_rows = []
        best = None
        for cname in COMPARE[dm]:
            try:
                m = MODELS[cname]
                w = _weights(y, p["weighting"])
                if n_out > 0:
                    r = m.fit(y[mask], _apply_constraints(_guess_params(m, cname, x[mask], y[mask]), p),
                              x=x[mask], weights=w[mask])
                else:
                    r = _fit(m, cname, x, y, w, p["robust"])
                comp_rows.append((LABELS[cname], len(r.var_names), _aicc(r, n_fit), r.bic, r.rsquared))
            except Exception:
                comp_rows.append((LABELS[cname], "—", "—", "—", "—"))
        comp_df = pd.DataFrame(comp_rows, columns=["模型", "参数k", "AICc", "BIC", "R²"])
        comp_df["ΔAICc"] = comp_df["AICc"].apply(
            lambda v: (v - comp_df["AICc"].min()) if isinstance(v, (int, float)) else "—")
        comp_df["ΔAICc"] = comp_df["ΔAICc"].apply(lambda v: fmt(v) if isinstance(v, (int, float)) else "—")
        comp_df["AICc"] = comp_df["AICc"].apply(lambda v: fmt(v) if isinstance(v, (int, float)) else "—")
        comp_df["BIC"] = comp_df["BIC"].apply(lambda v: fmt(v) if isinstance(v, (int, float)) else "—")
        comp_df["R²"] = comp_df["R²"].apply(lambda v: fmt(v) if isinstance(v, (int, float)) else "—")
        children[0].children.append(sh.section(
            f"模型比较（同族 {len(COMPARE[dm])} 个候选，AICc 越小越好）", sh.df_table(comp_df)))
        best_name = comp_df.iloc[0, 0] if len(comp_df) else ""
        interp_txt.append("AICc 比较表明当前数据由「%s」最好地解释。" % best_name)

    children[0].children.append(sh.interp("；".join(interp_txt)))
    return fig, children[0]


def _error_fig(p):
    fig = go.Figure()
    fig.update_layout(title="拟合失败，请调整参数或减少约束")
    theme_fig(fig, height=300)
    return fig


layout = lambda: analysis_page(
    PAGE_ID, "非线性回归 · 曲线拟合", 
    "拟合已知数学形式的模型并提取有生物学意义的参数（EC50、Vmax、Km、半衰期…）。"
    "左侧：数据点（均值±SEM）与拟合曲线、残差子图；右侧：完整还原 Prism 的"
    " Model / Parameters / Fit 三个选项卡参数，改动即时重拟合。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
