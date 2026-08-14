/** Custom Code 预置 Python 模板（与 Worker 注入的 IOData 契约一致）。 */
export const CUSTOM_CODE_DEFAULT_TEMPLATE = `"""
Supported packages:
pandas
numpy
scipy
scikit-learn
rdkit
plotly
openpyxl
pydantic
"""
from io import BytesIO
import pandas as pd
from typing import NamedTuple
import plotly.graph_objects as go

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    raise NotImplementedError("TODO: Return list of IOData")
`

/** Custom Code 失败时附给 agent 的最小可运行示例。 */
export const CUSTOM_CODE_IODATA_HINT = `返回必须是 list[IOData]。最小示例：
from typing import NamedTuple
import pandas as pd
class IOData(NamedTuple):
    name: str
    data: pd.DataFrame
def custom_code(inputs, **kwargs):
    df = pd.DataFrame([{"col": 1}])
    return [IOData(name="out", data=df)]
# 也可用 dict：return [{"name": "out", "data": df}]
Worker 已注入 IOData；data 须为 DataFrame / BytesIO / Figure。`

export function annotateCustomCodeError(msg: string): string {
  const s = String(msg ?? '')
  if (!/IOData|must return a list/i.test(s)) return s
  if (s.includes('最小示例') || s.includes('Example:')) return s
  return `${s}\n\n${CUSTOM_CODE_IODATA_HINT}`
}

/** rdkit + plotly 示例（文档/AI 可引用；不作为默认模板以免无 SMILES 列时失败）。 */
export const CUSTOM_CODE_RDKIT_EXAMPLE = `"""
Example: count atoms with rdkit and emit a Plotly bar chart.
Expects inputs[0].data to be a DataFrame with a SMILES column.
"""
from io import BytesIO
from typing import NamedTuple
import pandas as pd
import plotly.graph_objects as go
from rdkit import Chem

class IOData(NamedTuple):
    name: str
    data: BytesIO | pd.DataFrame | go.Figure

def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]:
    df = inputs[0].data.copy()
    smiles_col = "SMILES" if "SMILES" in df.columns else df.columns[0]
    atom_counts = []
    for s in df[smiles_col].astype(str):
        mol = Chem.MolFromSmiles(s)
        atom_counts.append(mol.GetNumAtoms() if mol is not None else None)
    out = df.copy()
    out["atom_count"] = atom_counts
    fig = go.Figure(data=[go.Bar(x=out[smiles_col].astype(str), y=out["atom_count"])])
    fig.update_layout(title="Atom counts", xaxis_title=smiles_col, yaxis_title="atoms")
    return [
        IOData(name="with_atoms", data=out),
        IOData(name="atom_chart", data=fig),
    ]
`
