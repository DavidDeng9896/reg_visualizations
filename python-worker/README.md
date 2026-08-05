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
# Optional (for rdkit examples):
# pip install -r requirements-docker.txt
uvicorn app.main:app --host 0.0.0.0 --port 8091
pytest tests/ -v
```

## Docker

```bash
cd python-worker
docker compose up --build
# → http://127.0.0.1:8091/health
```

Image installs `requirements.txt` + `requirements-docker.txt` (includes **rdkit**).

Point API proxies at the worker:

```bash
export PYTHON_WORKER_URL=http://127.0.0.1:8091
```

## Security (v1)

Execution uses `exec` without full sandbox isolation. Run in a network-isolated container with resource limits in production.
