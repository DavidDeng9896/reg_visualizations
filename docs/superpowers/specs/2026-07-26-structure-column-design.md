# Design: 结构列（SMILES / mol → RDKit SVG）

**分支：** `use_plotly`（或后续独立 feature 分支）  
**日期：** 2026-07-26  
**状态：** Draft for review

## 1. 目标与非目标

### 目标

- CSV **导入**时支持将某列标为 **结构（structure）**；并尽量 **自动识别** SMILES / mol。
- **导入后**仍可在表头把列类型改为 / 改回 structure。
- 结构列单元格用 **RDKit（浏览器 WASM）** 将 SMILES 或 molblock 渲染为 **SVG 缩略结构图**。
- 单元格 **默认只显示结构图**；悬停或点击再查看原文。
- 解析失败：显示 **警告图标**，悬停可见原文；空值仍为空白。

### 非目标（本版不做）

- 结构画布编辑器（手绘分子）
- 子结构搜索 / 高亮
- 服务端 RDKit 或导入时预存 SVG
- 图表轴把 structure 当数值维度
- SDF 多分子文件导入（可后续）

## 2. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 何时设类型 | 导入自动识别 + 可覆盖；导入后可改 | 用户选 C |
| RDKit 运行处 | 浏览器 `@rdkit/rdkit` WASM，按需加载 | 用户选 A；贴合纯前端架构 |
| 单元格展示 | 仅缩略 SVG；悬停/点击看原文 | 用户选 B |
| 解析失败 | 警告图标 + 悬停原文 | 用户选 A |
| 类型建模 | 扩展 `DataType` 增加 `'structure'` | 与现有列类型一致，避免旁路 format 散落 |
| 存储 | 单元格仍存原文 string；不持久化 SVG | 体积小；改值即重渲 |
| 渲染时机 | 懒加载 WASM + 视口内按需 + 内存 LRU 缓存 | 大表可滚动；首次有短暂加载 |

## 3. 数据模型与推断

### 3.1 类型

在 `shared/types.ts`：

```ts
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'structure'
```

- `ColumnMeta.dataType` 可取 `'structure'`
- `CellValue` 不变：结构列存 `string | null`（SMILES 或 molblock 原文）

### 3.2 导入推断（`csv.ts`）

采样默认前 **1000** 行非空值：

1. 含 `M  END` / `M END`，或明显 V2000/V3000 mol 头 → 视为 mol
2. 否则：候选 SMILES（允许的字符集、无明显自然语言空白），轻量启发式通过
3. 采样中 **≥ 80%** 非空值符合 1 或 2 → 推断为 `structure`
4. 优先级：明确 `number` / `boolean` / `date` / `datetime` 高于 structure；structure 高于兜底 `string`

### 3.3 coerce

- 空 → `null`
- 否则 `trim` 后保留字符串
- **导入时不调用 RDKit**（避免拖慢导入）

### 3.4 导入 UI

`CsvImportDialog` 类型下拉增加 **Structure**；可覆盖自动推断结果。

## 4. RDKit 加载与渲染

### 4.1 依赖与加载

- 依赖：`@rdkit/rdkit`
- 单例 `ensureRdkit()`：首次需要渲染 structure 列时再加载 WASM
- Vite：托管 `RDKit_minimal.wasm`，`initRDKitModule({ locateFile })` 指向正确 URL
- 加载失败：不拖垮表格；结构格统一警告「结构引擎不可用」

### 4.2 模块划分

| 模块 | 职责 |
|------|------|
| `structure/rdkit.ts` | WASM 单例加载 |
| `structure/parse.ts` | smiles / mol 探测（与导入启发式共用或薄封装） |
| `structure/render.ts` | `get_mol` → `get_svg`；LRU 缓存（约 500）；`mol.delete()` |
| `StructureCell.vue` | 缩略图 UI、skeleton、失败态、原文 popover |

### 4.3 管线

```
cell text → detect smiles|mol → RDKit.get_mol → get_svg(w,h) → cache → inline SVG
```

- 缩略尺寸约 **100×80**
- 加载中：skeleton
- 失败：警告图标；悬停/点击 popover 显示原文（只读），可选稍大预览图
- 相同文本命中缓存不重复解析

### 4.4 DataGrid

- `dataType === 'structure'` → `#default` 使用 `StructureCell`
- 结构列行高加大（约 88px）或列宽/单元格 min-height 适配缩略图
- **编辑**：文本框编辑 SMILES/mol；提交后清除该 key 缓存并重渲
- 表头：structure 专用图标（六元环类示意）

## 5. 导入后改类型

- 表头菜单（⋯ 或类型图标）：可改为 Structure，或改回 string / 其它现有类型
- → structure：不改单元格值，只切换展示；无效值警告图标
- structure → number 等：走现有 `coerceValue`；无法转换 → `null`
- 操作写入 analysis（`store.mutate`）；若现有表头操作已支持 undo 则一并接入，否则至少 mutate + toast

## 6. 边界行为

| 情况 | 行为 |
|------|------|
| 空单元格 | 空白 |
| 非法 SMILES/mol | 警告图标，悬停见原文 |
| mol 多行（CSV 引号包裹） | PapaParse 保留换行，按 molblock 解析 |
| WASM 未就绪 | skeleton |
| WASM 加载失败 | 警告 +「结构引擎不可用」 |
| 单格解析超时/极大 mol | 该格失败，其它格不受影响 |
| 导出 CSV | 导出原文，不导出 SVG |

## 7. 测试要点

- 推断：典型 SMILES 列 → `structure`；普通英文句子不误判
- 渲染：合法 SMILES → SVG 出现；非法 → 警告态
- 改类型：`string` ↔ `structure` 往返，值不丢
- 缓存：同文本只解析一次（单元测 mock RDKit）
- 导入下拉含 Structure；覆盖推断生效

## 8. 主要改动文件（预期）

- `shared/types.ts` — `DataType`
- `modules/table/csv.ts` — 推断 / coerce
- `modules/table/CsvImportDialog.vue` — 类型选项
- `modules/table/DataGrid.vue` / `editing.ts` — 渲染与编辑
- `modules/table/structure/**` + `StructureCell.vue` — 新建
- `ui/icons.ts` — structure 图标
- `vite.config.ts` / `package.json` — RDKit WASM
- `tests/unit/csv.spec.ts` + 新建 structure 单测

## 9. 开放项（实现时可微调）

- LRU 容量与 SVG 宽高常量
- 表头「改类型」具体挂在图标点击还是 ⋯ 菜单（实现时跟现有表头交互对齐）
- RDKit npm 精确版本钉选（实现时选当前稳定 WASM 构建）
