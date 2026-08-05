"""Tests for custom_code executor."""

from __future__ import annotations

import pytest

from app.executor import run_user_code

PASS_THROUGH_CODE = """
def custom_code(inputs):
    inp = inputs[0]
    return [IOData(name="renamed_output", data=inp.data)]
"""

INVALID_RETURN_CODE = """
def custom_code(inputs):
    return inputs[0]
"""

RAISE_VALUE_ERROR_CODE = """
def custom_code(inputs):
    raise ValueError("bad input value")
"""


def test_dataframe_pass_through():
    inputs = [
        {
            "name": "source_table",
            "kind": "dataframe",
            "columns": ["a", "b"],
            "rows": [[1, 2], [3, 4]],
        }
    ]
    result = run_user_code(PASS_THROUGH_CODE, inputs)

    assert result["ok"] is True
    assert result["error"] is None
    assert len(result["outputs"]) == 1
    output = result["outputs"][0]
    assert output["name"] == "renamed_output"
    assert output["kind"] == "dataframe"
    assert output["columns"] == ["a", "b"]
    assert output["rows"] == [[1, 2], [3, 4]]


def test_invalid_return_not_list():
    inputs = [
        {
            "name": "source_table",
            "kind": "dataframe",
            "columns": ["x"],
            "rows": [[1]],
        }
    ]
    result = run_user_code(INVALID_RETURN_CODE, inputs)

    assert result["ok"] is False
    assert "list" in result["error"]["message"].lower()


def test_raises_value_error():
    inputs = [
        {
            "name": "source_table",
            "kind": "dataframe",
            "columns": ["x"],
            "rows": [[1]],
        }
    ]
    result = run_user_code(RAISE_VALUE_ERROR_CODE, inputs)

    assert result["ok"] is False
    assert "bad input value" in result["error"]["message"]
    assert result["error"]["type"] == "ValueError"
