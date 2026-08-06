#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "[python-worker] Python not found. Install Python 3.11+ and re-run." >&2
  exit 1
fi

echo "[python-worker] installing requirements..."
"$PY" -m pip install -r requirements.txt

echo "[python-worker] starting on http://127.0.0.1:8091"
exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8091
