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
