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

- 多输入按**连线顺序**进入 `inputs`（dataset / file 可混连）
- DataFrame → Output datasets；BytesIO → Output files；Figure → Output charts（独立 Plotly 产物，非 bar/line CONFIGURE）
- 返回必须是 **list**；每项为 `IOData(name=..., data=...)`，也兼容 `{"name": ..., "data": ...}` 或 `(name, data)`

**错误示例：** `return [df]` 或 `return df`  
**正确示例：**

```python
return [IOData(name="标准化清洗数据", data=df_out)]
# 或
return [{"name": "标准化清洗数据", "data": df_out}]
```

## 白名单包（v1）

pandas, numpy, scipy, scikit-learn, rdkit, statsmodels, biopython, lmfit, matplotlib, seaborn, kaleido, plotly, pyarrow, openpyxl, pydantic

本地 `start.sh` 与 Docker 使用同一份 `python-worker/requirements.txt`。`GET /health` 返回已安装版本；缺核心包时 `ok: false`。

`flowkit` / `pycorn` 暂不预装（有真实流式 / AKTA 数据再加）。

return `plotly.graph_objects.Figure` 会在流程图上自动长出**只读 Python 图节点**（无 CONFIGURE），并可嵌入报告 / 看板。

## 使用

1. 从上游 table（或 file）端口拖线 → Add step → **Code / Custom code**
2. 在右侧编辑器编写 `custom_code`；可用「插入字段」或补全 `inputs[i].data["col"]`
3. Save 后运行；失败时节点与面板显示行号 + 异常
4. 输出表出现在 ANALYSIS DATA 树；**Output charts** 在配置面板与节点详情中预览；文件列出名称与大小

### rdkit 示例

模板常量 `CUSTOM_CODE_RDKIT_EXAMPLE`（`customCodeTemplate.ts`）演示：读 SMILES 列 → `atom_count` 表 + Plotly 柱状图。需 Worker 已安装 rdkit。

## 本地联调（三进程）

Custom Code 依赖 **Python Worker :8091**。只起 Go API（:8787）+ Vite（:7100）不够；未起 worker 时会出现：

`python worker unreachable ... dial tcp 127.0.0.1:8091: connectex: ... refused`

### Windows

```bat
cd python-worker
start.cmd
```

### macOS / Linux

```bash
cd python-worker && ./start.sh
# 或
cd python-worker && npm run install-deps && npm start
```

### 其余服务

```bash
# Go API（默认后端）
cd insight-api-go && go run ./cmd/server   # :8787

# 前端（Vite 把 /api 代理到 :8787）
cd insight-studio && npm run dev          # :7100
```

健康检查：打开 `http://127.0.0.1:8091/health` 应返回 `{"ok":true}`。

可选：`docker compose up --build`（`python-worker/`，含 rdkit）。
