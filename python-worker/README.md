# python-worker

FastAPI service that executes Custom Code Python scripts for the Insight flowchart.

## Contract

User scripts run in a namespace with `IOData`, `BytesIO`, `NamedTuple`, `pd`, and `go` (plotly) preloaded. Define:

```python
def custom_code(inputs: list[IOData]) -> list[IOData]:
    ...
```

## API

- `GET /health` → `{ "ok": true, "packages": { "pandas": "...", ... }, "missing": [] }`
- `POST /execute` → `{ code, inputs, limits? }` → execution result

Default port: **8091**.

## Quick start

**Windows（推荐）：** 双击或在终端运行：

```bat
cd python-worker
start.cmd
```

**macOS / Linux：**

```bash
cd python-worker
chmod +x start.sh
./start.sh
```

**npm（跨平台）：**

```bash
cd python-worker
npm start
```

`npm start` / `start.cmd` / `start.sh` 优先使用项目 `.venv`（Windows: `.venv/Scripts/python.exe`；macOS/Linux: `.venv/bin/python`），否则回退 PATH 上的 python；缺包时对所选解释器 `pip install`（有 `.venv` 时装进 venv）。

**Smoke（确认走 venv）：**

```bash
cd python-worker
python3 -m venv .venv   # or: python -m venv .venv
npm start
# 日志应含: using project venv: .../.venv/bin/python  (Windows: ...\.venv\Scripts\python.exe)
# 然后: curl -s http://127.0.0.1:8091/health
```

然后确认：`http://127.0.0.1:8091/health` → `ok: true` 且 `packages` 含 pandas / rdkit 等。
不要只用 `python -m uvicorn ...` 跳过安装，否则 Custom Code 会报 `No module named 'rdkit'`。

Go / Node API 默认把 `/api/python/execute` 代理到该地址；可用环境变量覆盖：

```bash
set PYTHON_WORKER_URL=http://127.0.0.1:8091
```

## Docker

```bash
cd python-worker
docker compose up --build
```

Image installs the same `requirements.txt` (includes rdkit, statsmodels, biopython, lmfit, etc.).

## Tests

```bash
pip install -r requirements.txt
pip install pytest httpx
pytest tests/ -v
```

## Security (v1)

Execution uses `exec` without full sandbox isolation. Run in a network-isolated container with resource limits in production.
