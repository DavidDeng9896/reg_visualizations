# data_entry_ai sample fixtures

Copied/derived from sibling repo https://github.com/DavidDeng9896/data_entry_ai (EO035 docs only — **fixtures**, not product requirements):

| File | Source | Purpose |
| --- | --- | --- |
| `docking_scores_20241105.csv` | EO035 CADD 对接样本（精简） | spaced headers + unit-in-parens columns |
| `pharmacophore_TREM_20251219.csv` | EO035 药效团样本（精简） | Fitness / Align Score |
| `mouse_pk_auc_f.csv` | EO035 鼠 PK 多指标（精简） | AUC/Cmax/T1/2/F with units |
| `cadd_数据说明.txt` | `doc/EO035/CADD原始数据/数据说明.txt` | text attachment (read-only, do not import) |
| `eo035_数据说明总体说明.txt` | `doc/EO035/数据说明总体说明.txt` | lifecycle context fixture |

Do not vendor the whole data_entry_ai repo or import its product features into Insight Studio.
