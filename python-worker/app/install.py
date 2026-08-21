"""Install only the worker whitelist from requirements.txt (no user-specified packages)."""

from __future__ import annotations

import subprocess
import sys
import threading
from pathlib import Path

from app.packages import health_payload, missing_packages

REQUIREMENTS_FILE = Path(__file__).resolve().parent.parent / "requirements.txt"

_lock = threading.Lock()
_busy = False


def install_busy() -> bool:
    return _busy


def install_whitelist_packages(*, timeout_sec: int = 600) -> dict:
    """pip install -r requirements.txt. Never accepts extra package names."""
    global _busy
    missing_before = missing_packages()
    if not missing_before:
        payload = health_payload()
        payload["installed"] = False
        payload["message"] = "白名单包已齐全，无需安装。"
        return payload

    if not REQUIREMENTS_FILE.is_file():
        payload = health_payload()
        payload["ok"] = False
        payload["installed"] = False
        payload["error"] = f"找不到 {REQUIREMENTS_FILE.name}"
        return payload

    with _lock:
        if _busy:
            payload = health_payload()
            payload["ok"] = False
            payload["installed"] = False
            payload["error"] = "正在安装白名单包，请稍候。"
            return payload
        _busy = True

    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(REQUIREMENTS_FILE)],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
    except subprocess.TimeoutExpired:
        payload = health_payload()
        payload["ok"] = False
        payload["installed"] = False
        payload["error"] = f"安装超时（>{timeout_sec}s）。请在本机手动 pip install -r requirements.txt。"
        return payload
    finally:
        _busy = False

    log = ((proc.stdout or "") + (proc.stderr or "")).strip()[-4000:]
    payload = health_payload()
    payload["pipOk"] = proc.returncode == 0
    payload["installed"] = proc.returncode == 0
    payload["missingBefore"] = missing_before
    payload["log"] = log
    if proc.returncode != 0:
        payload["ok"] = False
        payload["error"] = f"pip 退出码 {proc.returncode}。{log[-500:]}"
    elif payload.get("missing"):
        payload["ok"] = False
        payload["error"] = "pip 已结束但仍缺：" + ", ".join(payload["missing"])
    else:
        payload["message"] = "白名单包已安装。"
    return payload
