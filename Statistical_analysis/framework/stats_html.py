"""统计结果渲染：把 DataFrame / 键值对渲染成漂亮的 Dash HTML 表格与解读卡。"""
import numpy as np
from dash import html


def kv_table(rows, key_label="项目", value_label="结果"):
    """rows: list[(label, value)] 键值对表格。"""
    trs = [html.Tr([html.Th(key_label), html.Th(value_label)])]
    for k, v in rows:
        trs.append(html.Tr([html.Td(k), html.Td(str(v))]))
    return html.Table(trs, className="stats-table kv-table")


def df_table(df, index=True, index_name=None, float_fmt=".4g", max_rows=200):
    """pandas DataFrame → html.Table。"""
    header = [html.Th(index_name or "")]
    for c in df.columns:
        header.append(html.Th(str(c)))
    rows = [html.Tr(header)]
    n = 0
    for idx, row in df.iterrows():
        if n >= max_rows:
            rows.append(html.Tr([html.Td(f"… 共 {len(df)} 行，仅显示前 {max_rows} 行",
                                         colSpan=len(df.columns) + 1,
                                         style={"textAlign": "left", "color": "#888"})]))
            break
        cells = [html.Td(str(idx))]
        for c in df.columns:
            v = row[c]
            if isinstance(v, (float, np.floating)):
                cells.append(html.Td(f"{v:{float_fmt}}"))
            else:
                cells.append(html.Td(str(v)))
        rows.append(html.Tr(cells))
        n += 1
    return html.Table(rows, className="stats-table")


def section(title, body, first=False):
    cls = "stats-section" if not first else "stats-section first"
    return html.Div([html.Div(title, className="stats-section-title"), body], className=cls)


def interp(text):
    """解读卡：蓝色高亮的人话解读。"""
    return html.Div(text, className="interp")


def stats_card(children):
    return html.Div(children, className="stats-card")
