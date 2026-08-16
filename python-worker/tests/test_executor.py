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
    assert [c["field"] for c in output["columns"]] == ["a", "b"]
    assert output["rows"] == [{"a": 1, "b": 2}, {"a": 3, "b": 4}]


def test_dict_output_accepted():
    inputs = [
        {
            "name": "t",
            "kind": "dataframe",
            "columns": [{"field": "n", "dataType": "number"}],
            "rows": [{"n": 3}],
        }
    ]
    code = """
def custom_code(inputs):
    df = inputs[0].data
    return [{"name": "out", "data": df}]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True
    assert result["outputs"][0]["name"] == "out"
    assert result["outputs"][0]["rows"] == [{"n": 3}]


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


def test_dict_columns_and_rows_frontend_shape():
    inputs = [
        {
            "name": "t",
            "kind": "dataframe",
            "columns": [{"field": "n", "dataType": "number"}],
            "rows": [{"n": 3}],
        }
    ]
    code = """
def custom_code(inputs):
    df = inputs[0].data.copy()
    df["n2"] = df["n"] * 2
    return [IOData(name="out", data=df)]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True
    out = result["outputs"][0]
    assert [c["field"] for c in out["columns"]] == ["n", "n2"]
    assert out["rows"] == [{"n": 3, "n2": 6}]


def test_figure_and_file_outputs():
    import base64

    inputs = [
        {
            "name": "t",
            "kind": "dataframe",
            "columns": [{"field": "x", "dataType": "number"}],
            "rows": [{"x": 1}, {"x": 2}],
        }
    ]
    code = """
def custom_code(inputs):
    df = inputs[0].data
    fig = go.Figure(data=[go.Bar(x=["a", "b"], y=df["x"].tolist())])
    buf = BytesIO(b"hello-bytes")
    return [
        IOData(name="chart", data=fig),
        IOData(name="out.bin", data=buf),
    ]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True
    kinds = {o["kind"] for o in result["outputs"]}
    assert kinds == {"figure", "file"}
    fig = next(o for o in result["outputs"] if o["kind"] == "figure")
    assert "data" in fig["plotlyJson"]
    f = next(o for o in result["outputs"] if o["kind"] == "file")
    assert base64.b64decode(f["contentBase64"]) == b"hello-bytes"


def test_file_input_roundtrip():
    import base64

    payload = base64.b64encode(b"abc123").decode("ascii")
    inputs = [
        {
            "name": "notes.txt",
            "kind": "file",
            "filename": "notes.txt",
            "contentBase64": payload,
        }
    ]
    code = """
def custom_code(inputs):
    data = inputs[0].data
    data.seek(0)
    raw = data.read()
    return [IOData(name="echo.txt", data=BytesIO(raw + b"!"))]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True
    out = result["outputs"][0]
    assert out["kind"] == "file"
    assert base64.b64decode(out["contentBase64"]) == b"abc123!"


def test_rdkit_optional():
    pytest.importorskip("rdkit")
    inputs = [
        {
            "name": "mols",
            "kind": "dataframe",
            "columns": [{"field": "SMILES", "dataType": "string"}],
            "rows": [{"SMILES": "CCO"}, {"SMILES": "c1ccccc1"}],
        }
    ]
    code = """
from rdkit import Chem
def custom_code(inputs):
    df = inputs[0].data.copy()
    df["atoms"] = [
        Chem.MolFromSmiles(s).GetNumAtoms() if Chem.MolFromSmiles(s) else None
        for s in df["SMILES"]
    ]
    return [IOData(name="counted", data=df)]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True
    rows = result["outputs"][0]["rows"]
    assert rows[0]["atoms"] == 3
    assert rows[1]["atoms"] == 6


def test_accepts_dict_output():
    """AI / 用户常 return [{'name': ..., 'data': df}]，应与 IOData 等价。"""
    inputs = [
        {
            "name": "t",
            "kind": "dataframe",
            "columns": [{"field": "a", "dataType": "number"}],
            "rows": [{"a": 1}],
        }
    ]
    code = """
def custom_code(inputs):
    df = inputs[0].data
    return [{"name": "标准化清洗数据", "data": df}]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is True, result.get("error")
    assert result["outputs"][0]["name"] == "标准化清洗数据"
    assert result["outputs"][0]["kind"] == "dataframe"
    assert result["outputs"][0]["rows"] == [{"a": 1}]


def test_rejects_plain_dataframe_in_list():
    inputs = [
        {
            "name": "t",
            "kind": "dataframe",
            "columns": [{"field": "a", "dataType": "number"}],
            "rows": [{"a": 1}],
        }
    ]
    code = """
def custom_code(inputs):
    return [inputs[0].data]
"""
    result = run_user_code(code, inputs)
    assert result["ok"] is False
    assert "IOData" in result["error"]["message"]

