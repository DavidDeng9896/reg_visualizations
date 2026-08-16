"""Execute user custom_code scripts with IOData contract."""

from __future__ import annotations

import base64
import contextlib
import io
import signal
import sys
import traceback
from typing import Any, NamedTuple

import pandas as pd

try:
    import plotly.graph_objects as go
except ImportError:  # pragma: no cover - optional for minimal test envs
    go = None  # type: ignore[assignment,misc]


class IOData(NamedTuple):
    name: str
    data: Any


IODATA_RETURN_HINT = (
    "Each output must be an IOData object with name and data. "
    "Example: return [IOData(name='out', data=df)] "
    "or return [{'name': 'out', 'data': df}]. "
    "IOData is injected; data must be a DataFrame, BytesIO, or Figure."
)


class _TimeoutError(Exception):
    pass


def _timeout_handler(_signum: int, _frame: Any) -> None:
    raise _TimeoutError("Execution timed out")


def _build_inputs(inputs: list[dict]) -> list[IOData]:
    result: list[IOData] = []
    for item in inputs:
        name = item.get("name", "")
        kind = item.get("kind")
        if kind == "dataframe":
            columns = item.get("columns") or []
            rows = item.get("rows") or []
            col_names: list[str] = []
            for c in columns:
                if isinstance(c, dict):
                    col_names.append(str(c.get("field") or c.get("name") or ""))
                else:
                    col_names.append(str(c))
            col_names = [c for c in col_names if c]
            if rows and isinstance(rows[0], dict):
                df = pd.DataFrame(rows)
                if col_names:
                    # preserve declared order; keep extras
                    ordered = [c for c in col_names if c in df.columns] + [
                        c for c in df.columns if c not in col_names
                    ]
                    df = df.reindex(columns=ordered)
            else:
                df = pd.DataFrame(rows, columns=col_names or None)
            result.append(IOData(name=name, data=df))
        elif kind == "file":
            content_b64 = item.get("contentBase64") or ""
            raw = base64.b64decode(content_b64)
            result.append(IOData(name=name, data=io.BytesIO(raw)))
        else:
            raise ValueError(f"Unsupported input kind: {kind!r}")
    return result


def _serialize_output(item: IOData) -> dict:
    name = item.name
    data = item.data

    if isinstance(data, pd.DataFrame):
        columns = []
        for col in data.columns:
            series = data[col]
            dtype = "number" if pd.api.types.is_numeric_dtype(series) else "string"
            if pd.api.types.is_bool_dtype(series):
                dtype = "boolean"
            columns.append({"field": str(col), "title": str(col), "dataType": dtype})
        rows = data.where(pd.notnull(data), None).to_dict(orient="records")
        return {"name": name, "kind": "dataframe", "columns": columns, "rows": rows}

    if isinstance(data, io.BytesIO):
        data.seek(0)
        content = data.read()
        return {
            "name": name,
            "kind": "file",
            "filename": name,
            "contentBase64": base64.b64encode(content).decode("ascii"),
        }

    if go is not None and isinstance(data, go.Figure):
        return {
            "name": name,
            "kind": "figure",
            "plotlyJson": data.to_plotly_json(),
        }

    raise ValueError(
        f"Output {name!r} has unsupported data type: {type(data).__name__}"
    )


def _is_iodata_like(obj: Any) -> bool:
    if isinstance(obj, IOData):
        return True
    if isinstance(obj, dict):
        return "name" in obj and "data" in obj
    if isinstance(obj, tuple) and len(obj) == 2:
        return True
    if isinstance(obj, dict):
        return "name" in obj and "data" in obj
    name = getattr(obj, "name", None)
    data = getattr(obj, "data", None)
    return name is not None and data is not None


def _normalize_iodata(obj: Any) -> IOData:
    if isinstance(obj, IOData):
        return obj
    if isinstance(obj, dict):
        return IOData(name=obj["name"], data=obj["data"])
    if isinstance(obj, tuple) and len(obj) == 2:
        return IOData(name=obj[0], data=obj[1])
    if isinstance(obj, dict):
        return IOData(name=obj["name"], data=obj["data"])
    return IOData(name=obj.name, data=obj.data)


def _extract_user_line(exc: BaseException, user_code: str) -> int | None:
    tb = exc.__traceback__
    while tb is not None:
        frame = tb.tb_frame
        if frame.f_code.co_filename == "<string>":
            return tb.tb_lineno
        tb = tb.tb_next
    return None


def _error_result(
    message: str,
    *,
    line: int | None = None,
    exc_type: str | None = None,
    stdout: str = "",
    stderr: str = "",
) -> dict:
    error: dict[str, Any] = {"message": message}
    if line is not None:
        error["line"] = line
    if exc_type is not None:
        error["type"] = exc_type
    return {
        "ok": False,
        "outputs": [],
        "stdout": stdout,
        "stderr": stderr,
        "error": error,
    }


def run_user_code(code: str, inputs: list[dict], timeout_sec: int = 300) -> dict:
    """Execute user code defining custom_code(inputs) and return serialized outputs."""
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    namespace: dict[str, Any] = {
        "BytesIO": io.BytesIO,
        "NamedTuple": NamedTuple,
        "pd": pd,
        "IOData": IOData,
    }
    if go is not None:
        namespace["go"] = go

    use_alarm = (
        hasattr(signal, "SIGALRM")
        and timeout_sec > 0
        and __import__("threading").current_thread() is __import__("threading").main_thread()
    )
    old_handler = None
    if use_alarm:
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(timeout_sec)

    try:
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(
            stderr_buffer
        ):
            try:
                inputs_list = _build_inputs(inputs)
            except Exception as exc:
                return _error_result(
                    str(exc),
                    line=_extract_user_line(exc, code),
                    exc_type=type(exc).__name__,
                    stdout=stdout_buffer.getvalue(),
                    stderr=stderr_buffer.getvalue(),
                )

            try:
                exec(code, namespace)
            except Exception as exc:
                return _error_result(
                    str(exc),
                    line=_extract_user_line(exc, code),
                    exc_type=type(exc).__name__,
                    stdout=stdout_buffer.getvalue(),
                    stderr=stderr_buffer.getvalue(),
                )

            custom_code = namespace.get("custom_code")
            if custom_code is None or not callable(custom_code):
                return _error_result(
                    "User code must define a callable custom_code(inputs) function",
                    stdout=stdout_buffer.getvalue(),
                    stderr=stderr_buffer.getvalue(),
                )

            try:
                outputs = custom_code(inputs_list)
            except Exception as exc:
                return _error_result(
                    str(exc),
                    line=_extract_user_line(exc, code),
                    exc_type=type(exc).__name__,
                    stdout=stdout_buffer.getvalue(),
                    stderr=stderr_buffer.getvalue(),
                )

            if not isinstance(outputs, list):
                return _error_result(
                    "custom_code must return a list of IOData objects. " + IODATA_RETURN_HINT,
                    stdout=stdout_buffer.getvalue(),
                    stderr=stderr_buffer.getvalue(),
                )

            serialized: list[dict] = []
            for item in outputs:
                if not _is_iodata_like(item):
                    return _error_result(
                        f"{IODATA_RETURN_HINT} Got {type(item).__name__}: {item!r}"[:240],
                        stdout=stdout_buffer.getvalue(),
                        stderr=stderr_buffer.getvalue(),
                    )
                try:
                    serialized.append(_serialize_output(_normalize_iodata(item)))
                except Exception as exc:
                    return _error_result(
                        str(exc),
                        line=_extract_user_line(exc, code),
                        exc_type=type(exc).__name__,
                        stdout=stdout_buffer.getvalue(),
                        stderr=stderr_buffer.getvalue(),
                    )

            return {
                "ok": True,
                "outputs": serialized,
                "stdout": stdout_buffer.getvalue(),
                "stderr": stderr_buffer.getvalue(),
                "error": None,
            }
    except _TimeoutError:
        return _error_result(
            f"Execution timed out after {timeout_sec} seconds",
            exc_type="TimeoutError",
            stdout=stdout_buffer.getvalue(),
            stderr=stderr_buffer.getvalue(),
        )
    finally:
        if use_alarm:
            signal.alarm(0)
            if old_handler is not None:
                signal.signal(signal.SIGALRM, old_handler)
