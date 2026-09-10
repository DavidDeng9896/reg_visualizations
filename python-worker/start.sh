#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -x .venv/bin/python ]]; then
  PY=.venv/bin/python
  echo "[python-worker] using project venv: $PY"
elif [[ -x .venv/bin/python3 ]]; then
  PY=.venv/bin/python3
  echo "[python-worker] using project venv: $PY"
elif command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "[python-worker] Python not found (no .venv and none on PATH)." >&2
  echo "Create one: python3 -m venv .venv" >&2
  echo "Then: .venv/bin/python -m pip install -r requirements.txt" >&2
  exit 1
fi

echo "[python-worker] installing requirements..."
"$PY" -m pip install -r requirements.txt

echo "[python-worker] starting on http://127.0.0.1:8091"
exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8091
