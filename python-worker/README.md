# python-worker

FastAPI service that executes Custom Code Python scripts for the Insight flowchart.

## Contract

User scripts run in a namespace with `IOData`, `BytesIO`, `NamedTuple`, `pd`, and `go` (plotly) preloaded. Define:

```python
def custom_code(inputs: list[IOData]) -> list[IOData]:
    ...
```

## API

- `GET /health` → `{"ok": true}`
- `POST /execute` → `{ code, inputs, limits? }` → execution result

Default port: **8091**.

## Local dev

```bash
pip install -r requirements.txt
pip install pytest httpx
uvicorn app.main:app --host 0.0.0.0 --port 8091
pytest tests/ -v
```

## Docker

```bash
docker build -t python-worker .
docker run -p 8091:8091 python-worker
```

`rdkit` is not in `requirements.txt` (local tests skip it). Install via conda or a platform wheel in Docker when needed.

## Security (v1)

Execution uses `exec` without full sandbox isolation. Run in a network-isolated container with resource limits in production.
