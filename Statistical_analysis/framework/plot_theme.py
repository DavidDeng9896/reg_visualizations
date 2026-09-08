"""Prism 风格 Plotly 主题与绘图辅助。"""
import plotly.graph_objects as go

PALETTE = [
    "#3D6FB4", "#E15759", "#59A14F", "#F28E2B", "#B07AA1",
    "#76B7B2", "#FF9DA7", "#9C755F", "#4E79A7", "#EDC948",
]

FONT = "Segoe UI, Microsoft YaHei, Arial, sans-serif"


def theme_fig(fig, height=520, margin=None):
    fig.update_layout(
        template="plotly_white",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        font=dict(family=FONT, size=13, color="#333333"),
        height=height,
        margin=margin or dict(l=70, r=30, t=55, b=60),
        hoverlabel=dict(bgcolor="#ffffff", bordercolor="#cccccc", font_size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
    )
    fig.update_xaxes(
        showgrid=True, gridcolor="#F2F2F2", zeroline=False,
        linecolor="#DDDDDD", linewidth=1, ticks="outside",
    )
    fig.update_yaxes(
        showgrid=True, gridcolor="#F2F2F2", zeroline=False,
        linecolor="#DDDDDD", linewidth=1, ticks="outside",
    )
    return fig


def corner_note(fig, text, x=0.02, y=0.98, color="#333333", fs=13,
                bg="#ffffff", border="#DDDDDD", xanchor="left", yanchor="top"):
    """把统计结果/关键参数作为文本标注放在图角上。"""
    fig.add_annotation(
        x=x, y=y, text=text, showarrow=False, xref="paper", yref="paper",
        xanchor=xanchor, yanchor=yanchor, align="left",
        font=dict(size=fs, color=color, family="Consolas, 'Microsoft YaHei', monospace"),
        bgcolor=bg, bordercolor=border, borderwidth=1, borderpad=7, opacity=0.96,
    )
    return fig


def ci_band(fig, x, lower, upper, fillcolor="#3D6FB4", name="95% CI"):
    """填充置信带。"""
    x = list(x); lo = list(lower); hi = list(upper)
    fig.add_trace(go.Scatter(
        x=x + x[::-1], y=hi + lo[::-1],
        fill="toself", fillcolor=fillcolor, opacity=0.18,
        line=dict(color="rgba(0,0,0,0)"), hoverinfo="skip",
        name=name, showlegend=False,
    ))
    return fig


def scatter_trace(x, y, name=None, color="#3D6FB4", size=7, symbol="circle",
                  error_y=None, showlegend=False, hovertemplate=None, customdata=None):
    tr = go.Scatter(
        x=x, y=y, mode="markers", name=name,
        marker=dict(color=color, size=size, symbol=symbol,
                    line=dict(width=1, color="#ffffff")),
        showlegend=showlegend,
    )
    if error_y is not None:
        tr.error_y = dict(type="data", array=error_y, visible=True,
                          thickness=1.2, width=4, color="rgba(70,70,70,0.7)")
    if hovertemplate:
        tr.hovertemplate = hovertemplate
    if customdata is not None:
        tr.customdata = customdata
    return tr


def line_trace(x, y, name=None, color="#E15759", width=2.5, dash="solid",
               showlegend=False, hovertemplate=None, opacity=1.0):
    tr = go.Scatter(
        x=x, y=y, mode="lines", name=name,
        line=dict(color=color, width=width, dash=dash),
        showlegend=showlegend, opacity=opacity,
    )
    if hovertemplate:
        tr.hovertemplate = hovertemplate
    return tr
