"""通用分析回调注册：统一处理「数据缓存 + 参数变化 + 重新生成」的 Dash callback。

模式：dcc.Store 缓存数据。控件变化时不重新生成数据（只用缓存重算分析），
只有点了「重新生成」按钮或改了 data_param 标记的控件时才重新生成数据。

Dash 4.x 参数绑定要点：Input/State 的 flat 值按「inputs 在前、state 在后」作为
位置参数传给回调函数（func_args），因此签名用 *values 捕获全部，
再从末尾取 State 的 store 数据。
"""
from dash import callback, Input, Output, State


def register_analysis(page_id, controls, fig_id, stats_id, store_id, regen_id,
                      generate_data, analyze):
    """注册一个分析页面的核心回调。

    参数:
      page_id        页面命名空间前缀
      controls       控件 spec 列表（同 layout 使用的那份）
      fig_id         dcc.Graph 组件 id
      stats_id       统计结果容器 id
      store_id       dcc.Store 数据缓存 id
      regen_id       「重新生成数据」按钮 id
      generate_data(params) -> data dict（含 _meta）
      analyze(data, params)  -> (figure, stats_children)
    """
    value_inputs = []
    ordered = []  # (namespaced_id, spec)
    for spec in controls:
        if spec["type"] == "group":
            continue
        cid = f"{page_id}-{spec['id']}"
        ordered.append((cid, spec))
        value_inputs.append(Input(cid, "value"))

    @callback(
        Output(fig_id, "figure"),
        Output(stats_id, "children"),
        Output(store_id, "data"),
        Input(regen_id, "n_clicks"),
        *value_inputs,
        State(store_id, "data"),
        prevent_initial_call=False,
    )
    def _update(n_clicks, *values):
        # values = [input1..inputN, state_store_data]
        n_controls = len(value_inputs)
        input_values = list(values[:n_controls])
        stored = values[n_controls] if len(values) > n_controls else None

        params = {}
        data_params = {}
        for (cid, spec), v in zip(ordered, input_values):
            if spec["type"] == "checkbox":
                v = bool(v and "on" in v)
            elif spec["type"] == "number":
                try:
                    v = float(v) if v not in (None, "") else spec.get("value")
                except (TypeError, ValueError):
                    v = spec.get("value")
            params[spec["id"]] = v
            if spec.get("data_param"):
                data_params[spec["id"]] = v

        n = n_clicks if n_clicks is not None else 0
        meta = (stored or {}).get("_meta", {})
        if stored is None or meta.get("click", -1) != n or meta.get("dp") != data_params:
            data = generate_data(params)
            data["_meta"] = {"click": n, "dp": data_params}
        else:
            data = stored

        fig, stats = analyze(data, params)
        return fig, stats, data

    return _update
