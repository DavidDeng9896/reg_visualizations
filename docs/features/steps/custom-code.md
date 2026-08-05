# Custom Code（Python）

流程图步骤：在托管 Python Worker 中执行用户脚本，入出均为 `list[IOData]`。

## 契约

```python
class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    ...
```

- 多输入按连线顺序进入 `inputs`
- DataFrame → Output datasets；BytesIO → Output files；Figure → Output charts（独立 Plotly 产物）

## 白名单包（v1）

pandas, numpy, scipy, scikit-learn, rdkit, plotly, openpyxl, pydantic

## 使用

1. 从上游 table（或 file）端口拖线 → Add step → **Code / Custom code**
2. 在右侧编辑器编写 `custom_code`；可用「插入字段」或补全 `inputs[i].data["col"]`
3. Save 后运行；失败时节点与面板显示行号 + 异常
4. 输出表出现在 ANALYSIS DATA 树，可继续下游步骤

## 本地联调

```bash
# Worker
cd python-worker && pip install -r requirements.txt && uvicorn app.main:app --port 8091

# API（Node 或 Go 均可代理 /api/python/execute）
cd insight-api && npm run dev   # :8787，PYTHON_WORKER_URL 默认同上

# 前端
cd insight-studio && npm run dev
```
