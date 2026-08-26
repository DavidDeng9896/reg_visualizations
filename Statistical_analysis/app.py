"""Prism Lab — AI 驱动 GraphPad Prism 复刻交互实验室（主入口）。

运行: .venv/Scripts/python.exe app.py  →  http://127.0.0.1:8050
"""
import dash
from dash import html, dcc

app = dash.Dash(
    __name__,
    use_pages=True,
    suppress_callback_exceptions=True,
    title="Prism Lab · 统计分析交互实验室",
)

import pages  # noqa: E402,F401  确保所有页面模块注册（须在 app 实例化之后）


def build_sidebar():
    links = [html.Div([
        html.Div("Prism Lab", className="brand"),
        html.Small("AI 驱动 · 复刻 GraphPad Prism", style={"color": "#9aa3b0",
                                                           "fontSize": 11,
                                                           "display": "block",
                                                           "padding": "0 10px 6px"}),
    ])]
    for cat, items in pages.NAV:
        links.append(html.Div(cat, className="nav-cat"))
        for idx, (name, path) in enumerate(items, 1):
            links.append(dcc.Link(
                html.Span([html.Span(f"{idx:02d}", className="idx"), name]),
                href=path, className="nav-item",
            ))
    return html.Div(links, className="sidebar")


app.layout = html.Div([
    build_sidebar(),
    html.Div(dash.page_container, className="main"),
], className="app")

if __name__ == "__main__":
    app.run(debug=False, port=8050, host="127.0.0.1")
