/** Custom Code 科学包白名单（与 python-worker health 探测名对齐）。不含 fastapi/uvicorn。 */
export const PYTHON_SCIENTIFIC_PACKAGES = [
  'pandas',
  'numpy',
  'scipy',
  'scikit-learn',
  'rdkit',
  'statsmodels',
  'biopython',
  'lmfit',
  'matplotlib',
  'seaborn',
  'kaleido',
  'plotly',
  'pyarrow',
  'openpyxl',
  'pydantic',
  // statlib 依赖（组间比较非参 / 事后检验）
  'pingouin',
  'scikit-posthocs',
] as const

export type PythonScientificPackage = (typeof PYTHON_SCIENTIFIC_PACKAGES)[number]

/** AI / 侧栏单行列表。 */
export function pythonPackagesPromptList(): string {
  return PYTHON_SCIENTIFIC_PACKAGES.join(', ')
}

/** 模板文件头 Supported packages 段。 */
export function pythonPackagesTemplateComment(): string {
  return `Supported packages:\n${PYTHON_SCIENTIFIC_PACKAGES.join('\n')}`
}
