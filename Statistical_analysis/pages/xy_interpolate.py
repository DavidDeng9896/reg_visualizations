"""XY 分析 #10：标准曲线插值 —— 由标准曲线反算未知样本浓度。"""
import dash
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from lmfit import Model

from framework.layout import analysis_page
from framework.registration import register_analysis
from framework.plot_theme import theme_fig, corner_note, scatter_trace, line_trace, PALETTE
from framework import stats_html as sh
from framework.utils import fmt

PAGE_ID = "xy-interpolate"
dash.register_page(__name__, path="/xy/interpolate", title="标准曲线插值", name="标准曲线插值")

CONTROLS = [
    {"type": "group", "title": "标准曲线数据"},
    {"type": "slider", "id": "n_std", "label": "标准品点数", "min": 6, "max": 14,
     "value": 8, "data_param": True},
    {"type": "slider", "id": "noise", "label": "标准品噪声 SD", "min": 0.5, "max": 6,
     "step": 0.25, "value": 2.0, "data_param": True},
    {"type": "group", "title": "未知样本"},
    {"type": "slider", "id": "n_unk", "label": "未知样本数", "min": 1, "max": 6,
     "value": 3, "data_param": True},
    {"type": "slider", "id": "unk_noise", "label": "未知样本噪声 SD", "min": 0.5, "max": 6,
     "step": 0.25, "value": 2.0, "data_param": True},
    {"type": "group", "title": "拟合设置"},
    {"type": "radio", "id": "fit_model", "label": "标准曲线模型",
     "options": [{"label": "4PL（推荐，ELISA/qPCR）", "value": "4pl"},
                 {"label": "线性", "value": "linear"}],
     "value": "4pl"},
]


def _pl4(x, Bottom, Top, LogEC50, Hill):
    return Bottom + (Top - Bottom) / (1 + 10 ** ((LogEC50 - x) * Hill))


FIG_ID = f"fig-{PAGE_ID}"; STATS_ID = f"stats-{PAGE_ID}"
STORE_ID = f"store-{PAGE_ID}"; REGEN_ID = f"regen-{PAGE_ID}"


def generate_data(p):
    rng = np.random.default_rng(51)
    xlog = np.linspace(-2, 2, p["n_std"])
    y = _pl4(xlog, 8, 100, 0.0, 1.0) + rng.normal(0, p["noise"], len(xlog))
    # 未知样本：在曲线中段取 3 个真实浓度
    unk_true = 10 ** np.array([-0.8, 0.0, 0.9])
    unk_y = _pl4(np.log10(unk_true), 8, 100, 0.0, 1.0) + rng.normal(0, p["unk_noise"], len(unk_true))
    return {"x": xlog.tolist(), "y": y.tolist(),
            "unk_true": unk_true.tolist(), "unk_y": unk_y.tolist()}


def analyze(data, p):
    x = np.array(data["x"], dtype=float)
    y = np.array(data["y"], dtype=float)
    unk_y = np.array(data["unk_y"], dtype=float)
    unk_true = np.array(data["unk_true"], dtype=float)

    xx = np.linspace(x.min() - 0.2, x.max() + 0.2, 300)
    if p["fit_model"] == "4pl":
        model = Model(_pl4)
        pm = model.make_params(Bottom=dict(value=y.min()), Top=dict(value=y.max()),
                               LogEC50=dict(value=np.median(x)), Hill=dict(value=1.0))
        result = model.fit(y, pm, x=x)
        ycurve = result.eval(x=xx)
        # 反算：x = LogEC50 - log10((Top-y)/(y-Bottom))/Hill
        Top = result.params["Top"].value; Bot = result.params["Bottom"].value
        LogE = result.params["LogEC50"].value; Hill = result.params["Hill"].value
        with np.errstate(divide="ignore", invalid="ignore"):
            logx_pred = LogE - np.log10(np.clip((Top - unk_y) / np.clip(unk_y - Bot, 1e-9, None), 1e-9, None)) / Hill
        conc_pred = 10 ** logx_pred
    else:
        b, a = np.polyfit(x, y, 1)
        ycurve = a + b * xx
        conc_pred = (unk_y - a) / b
        logx_pred = np.log10(conc_pred)

    fig = go.Figure()
    fig.add_trace(scatter_trace(x, y, name="标准品", color=PALETTE[0], size=8,
                                hovertemplate="log₁₀C=%{x:.2f}<br>OD=%{y:.2f}<extra>标准品</extra>"))
    fig.add_trace(line_trace(xx, ycurve, name=f"标准曲线（{'4PL' if p['fit_model'] == '4pl' else '线性'}）",
                             color=PALETTE[1], width=3))
    # 未知样本
    fig.add_trace(go.Scatter(x=[np.log10(u) for u in unk_true], y=unk_y, mode="markers",
                             marker=dict(color="#E15759", size=11, symbol="diamond"),
                             name="未知样本", hovertemplate="真实log₁₀C=%{x:.2f}<br>Y=%{y:.2f}<extra></extra>"))
    for uy, lx in zip(unk_y, logx_pred):
        if np.isfinite(lx):
            fig.add_trace(go.Scatter(
                x=[lx, lx, lx], y=[uy, uy, 0], mode="lines",
                line=dict(color="#E15759", width=1, dash="dot"), showlegend=False,
                hoverinfo="skip"))
            fig.add_annotation(x=lx, y=uy + 6, text=f"→{10 ** lx:.2g}",
                               showarrow=False, font=dict(size=11, color="#E15759"))
    note = (f"标准曲线拟合 {'4PL' if p['fit_model'] == '4pl' else '线性'}\n"
            f"R² = {result.rsquared:.4f}" if p["fit_model"] == "4pl" else f"线性回归 R² = {np.corrcoef(x, y)[0, 1] ** 2:.4f}")
    corner_note(fig, note, fs=12.5)
    fig.update_xaxes(title_text="log₁₀[浓度]")
    fig.update_yaxes(title_text="响应（OD/信号）")
    theme_fig(fig, height=480)

    unk_rows = []
    for i, (ut, uy, cp) in enumerate(zip(unk_true, unk_y, conc_pred), 1):
        err = (cp - ut) / ut * 100 if ut > 0 else float("nan")
        unk_rows.append((f"样本{i}", fmt(ut), fmt(uy), fmt(cp), f"{err:.1f}%"))
    unk_df = pd.DataFrame(unk_rows, columns=["未知样本", "真实浓度", "测得 Y", "反算浓度", "误差%"])

    std_rows = []
    if p["fit_model"] == "4pl":
        for pn in result.var_names:
            par = result.params[pn]
            std_rows.append((pn, fmt(par.value), fmt(par.stderr)))
        std_df = pd.DataFrame(std_rows, columns=["参数", "估计", "SE"])
    else:
        std_rows = [("截距 a", fmt(a), "—"), ("斜率 b", fmt(b), "—")]
        std_df = pd.DataFrame(std_rows, columns=["参数", "估计", "SE"])

    stats = sh.stats_card([
        sh.section("标准曲线参数", sh.df_table(std_df), first=True),
        sh.section("未知样本浓度反算", sh.df_table(unk_df)),
        sh.interp("由标准曲线反算未知样本浓度是 ELISA / qPCR / 蛋白定量的标准流程。"
                  "反算浓度应落在标准曲线范围内，超出范围的结果不可靠。"),
    ])
    return fig, stats


layout = lambda: analysis_page(
    PAGE_ID, "标准曲线插值 · 反算未知样本浓度",
    "先拟合标准曲线（4PL 或线性），再由未知样本的响应值 Y 反解浓度 X，ELISA/qPCR/蛋白定量标准流程。"
    "图上用虚线箭头标注反算过程。",
    CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID)

register_analysis(PAGE_ID, CONTROLS, FIG_ID, STATS_ID, STORE_ID, REGEN_ID,
                  generate_data=generate_data, analyze=analyze)
