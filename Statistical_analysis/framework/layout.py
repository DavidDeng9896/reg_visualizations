"""分析页面统一布局：标题 + 描述 + 左侧图/结果区 + 右侧参数面板。"""
from dash import dcc, html

from framework.controls import build_controls


def analysis_page(page_id, title, desc, controls, fig_id, stats_id, store_id, regen_id,
                  regen_label="🔄 重新生成数据"):
    panel = html.Div([
        html.Button(regen_label, id=regen_id, className="btn-regen", n_clicks=0),
        html.Hr(style={"margin": "10px 0 4px", "border": "none", "borderTop": "1px solid #eee"}),
        *build_controls(controls, page_id),
    ], className="panel")

    return html.Div([
        html.H2(title, className="page-title"),
        html.Div(desc, className="page-desc"),
        html.Div([
            html.Div([
                dcc.Graph(id=fig_id, config={"displayModeBar": True, "scrollZoom": True}),
                html.Div(id=stats_id),
            ], className="plot-area"),
            panel,
        ], className="workspace"),
        dcc.Store(id=store_id, data=None),
    ])
