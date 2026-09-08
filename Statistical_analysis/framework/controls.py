"""声明式控件系统：把 Prism 对话框控件抽象为 spec，统一构建 dcc 组件。

控件 spec 支持类型：
  group    -> {"type":"group", "title":"选项卡名"}           分节标题
  slider   -> {"type":"slider", "id","label","min","max","step","value","marks?"}
  select   -> {"type":"select", "id","label","options":[{label,value}],"value"}
  radio    -> {"type":"radio",  "id","label","options":[...],"value"}
  checkbox -> {"type":"checkbox","id","label","value":bool}
  number   -> {"type":"number", "id","label","value","step?"}
任何控件可加 "data_param": True 表示改它要重新生成数据；
"help" 可选，作为灰色说明文字显示在控件下方。
"""
from dash import dcc, html


def _build_component(t, cid, spec):
    if t == "slider":
        return dcc.Slider(
            id=cid,
            min=spec["min"], max=spec["max"],
            step=spec.get("step", 1),
            value=spec["value"],
            marks=spec.get("marks"),
            tooltip={"placement": "bottom", "always_visible": True},
        )
    if t == "select":
        return dcc.Dropdown(
            id=cid, options=spec["options"], value=spec["value"], clearable=False,
            style={"minWidth": "100%"}, optionHeight=28,
        )
    if t == "radio":
        return dcc.RadioItems(
            id=cid, options=spec["options"], value=spec["value"],
            labelStyle={"display": "block", "margin": "2px 0", "fontSize": 13},
        )
    if t == "checkbox":
        return dcc.Checklist(
            id=cid,
            options=[{"label": spec["label"], "value": "on"}],
            value=["on"] if spec.get("value") else [],
            labelStyle={"fontSize": 13, "color": "#444"},
        )
    if t == "number":
        return dcc.Input(
            id=cid, type="number", value=spec["value"],
            step=spec.get("step", 0.1), style={"width": "100%"},
        )
    if t == "text":
        return dcc.Input(id=cid, type="text", value=spec["value"], style={"width": "100%"})
    raise ValueError(f"未知控件类型: {t}")


def build_controls(controls, page_id):
    """根据 spec 列表生成右侧参数面板组件。控件 id 用 page_id 做命名空间保证全局唯一。"""
    comps = []
    for spec in controls:
        t = spec["type"]
        if t == "group":
            comps.append(html.Div(spec["title"], className="ctrl-group-title"))
            continue
        cid = f"{page_id}-{spec['id']}"
        if t == "checkbox":
            comps.append(html.Div(_build_component(t, cid, spec), className="ctrl-row ctrl-check"))
        else:
            comps.append(html.Label(spec.get("label", cid), className="ctrl-label",
                                    title=spec.get("help", "")))
            comps.append(html.Div(_build_component(t, cid, spec), className="ctrl-row"))
        if spec.get("help"):
            comps.append(html.Div(spec["help"], className="ctrl-help"))
    return comps
