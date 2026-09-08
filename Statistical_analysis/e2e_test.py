"""端到端验证：直接 POST 到 Dash 回调端点，模拟浏览器触发回调。"""
import json
import urllib.request

import dash

_app = dash.Dash(__name__, use_pages=True, suppress_callback_exceptions=True)
import pages  # noqa


def default_value(spec):
    if spec["type"] == "checkbox":
        return ["on"] if spec.get("value") else []
    return spec.get("value")


def build_payload(page_id, controls, fig_id, stats_id, store_id, regen_id, overrides=None):
    inputs = [{"id": regen_id, "property": "n_clicks", "value": 0}]
    for spec in controls:
        if spec["type"] == "group":
            continue
        val = default_value(spec)
        if overrides and spec["id"] in overrides:
            val = overrides[spec["id"]]
        inputs.append({"id": f"{page_id}-{spec['id']}", "property": "value", "value": val})
    outputs = [{"id": fig_id, "property": "figure"},
               {"id": stats_id, "property": "children"},
               {"id": store_id, "property": "data"}]
    # Dash 4.x 的 output key 格式: "..id.prop...id.prop.."（三点分隔、双点包裹）
    out_key = ".." + "...".join(f"{o['id']}.{o['property']}" for o in outputs) + ".."
    return {"output": out_key, "outputs": outputs, "inputs": inputs,
            "state": [{"id": store_id, "property": "data", "value": None}],
            "changedPropIds": [out_key]}


def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


URL = "http://127.0.0.1:8050/_dash-update-component"

# 测试 4 个有代表性的页面
tests = [
    ("xy_nonlinear", {"xy-nonlinear-compare_models": ["on"]}),
    ("col_ttests", {"col-ttests-design": "paired"}),
    ("col_anova", {"col-anova-approach": "nonparam"}),
    ("col_roc", {"col-roc-show_dist": []}),
    ("col_stackpvals", {"col-stackpvals-correction": "bonferroni"}),
]
for name, overrides in tests:
    m = __import__(f"pages.{name}", fromlist=["*"])
    fig_id, stats_id, store_id = m.FIG_ID, m.STATS_ID, m.STORE_ID
    payload = build_payload(m.PAGE_ID, m.CONTROLS, fig_id, stats_id, store_id,
                            m.REGEN_ID, overrides)
    try:
        resp = post(URL, payload)
        res = resp.get("response", resp)
        # Dash 4.x 多输出格式: {fig_id: {"figure": {...}}, stats_id: {...}, store_id: {"data": {...}}}
        fig = res.get(fig_id, {}).get("figure", {})
        n_traces = len(fig.get("data", [])) if isinstance(fig, dict) else 0
        store = res.get(store_id, {}).get("data", {})
        store_has = bool(store) and (bool(store.get("x")) or bool(store.get("mat"))
                                     or bool(store.get("groups")) or bool(store.get("case")))
        stats_html = res.get(stats_id, {})
        has_stats = bool(stats_html) and "props" in str(stats_html)
        print(f"OK  {name}: traces={n_traces}  store_data={store_has}  stats={has_stats}")
    except Exception as e:
        print(f"FAIL {name}: {e!r}")
