# Structure Column (RDKit SVG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `DataType: 'structure'` so CSV import can auto-detect SMILES/mol columns, users can override/change types later, and DataGrid renders structure cells as RDKit SVG thumbnails in the browser.

**Architecture:** Cells store raw SMILES/mol strings. Shared heuristics in `structure/parse.ts` feed CSV inference. `@rdkit/rdkit` WASM loads once via `ensureRdkit()`; `renderStructureSvg` caches SVG with LRU. `StructureCell.vue` is the only UI that draws molecules; DataGrid switches on `dataType === 'structure'`.

**Tech Stack:** Vue 3, Vite, `@rdkit/rdkit`, vxe-table, Vitest

## Global Constraints

- Cell storage stays `string | null` — never persist SVG
- Do not call RDKit during CSV import (heuristics only)
- Thumbnail-only in cell; original text in hover/click popover
- Parse failure → warning icon + hover original; empty → blank
- Filter operators for `structure` use the same set as `string` (text ops)
- Do not add structure editor, substructure search, or SDF import
- Prefer Chinese UI copy consistent with existing toasts

## File map

| Path | Responsibility |
|------|----------------|
| `insight-studio/src/shared/types.ts` | Add `'structure'` to `DataType` |
| `insight-studio/src/modules/table/structure/parse.ts` | `looksLikeMol` / `looksLikeSmiles` / `isStructureCandidate` |
| `insight-studio/src/modules/table/structure/rdkit.ts` | `ensureRdkit()` WASM singleton |
| `insight-studio/src/modules/table/structure/render.ts` | `renderStructureSvg`, `invalidateStructureCache` |
| `insight-studio/src/modules/table/structure/StructureCell.vue` | Thumbnail / skeleton / error / popover |
| `insight-studio/src/modules/table/csv.ts` | Infer + coerce structure |
| `insight-studio/src/modules/table/CsvImportDialog.vue` | Structure in type dropdown |
| `insight-studio/src/modules/table/editing.ts` | `parseCellInput` for structure |
| `insight-studio/src/modules/table/filterForm.ts` | `operatorsFor('structure')` → text ops |
| `insight-studio/src/modules/table/DataGrid.vue` | Structure cell + header type change |
| `insight-studio/src/ui/icons.ts` | `type-structure` icon |
| `insight-studio/vite.config.ts` / `package.json` | `@rdkit/rdkit` + wasm asset + chunk |
| `insight-studio/tests/unit/structure/*.spec.ts` | parse / render (mocked) |
| `insight-studio/tests/unit/csv.spec.ts` | structure inference / coerce |

---

### Task 1: Types + parse heuristics (TDD)

**Files:**
- Modify: `insight-studio/src/shared/types.ts`
- Create: `insight-studio/src/modules/table/structure/parse.ts`
- Create: `insight-studio/tests/unit/structure/parse.spec.ts`

**Interfaces:**
- Produces:
  - `export type DataType = ... | 'structure'`
  - `looksLikeMol(text: string): boolean`
  - `looksLikeSmiles(text: string): boolean`
  - `isStructureCandidate(text: string): boolean` — mol OR smiles

- [ ] **Step 1: Extend DataType**

In `shared/types.ts`, change:

```ts
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'structure'
```

- [ ] **Step 2: Write failing tests for parse heuristics**

```ts
// tests/unit/structure/parse.spec.ts
import { describe, expect, it } from 'vitest'
import { isStructureCandidate, looksLikeMol, looksLikeSmiles } from '../../../src/modules/table/structure/parse'

describe('looksLikeMol', () => {
  it('recognizes V2000 molblock ending with M END', () => {
    const mol = [
      '',
      '  Mrv',
      '',
      '  1  0  0  0  0  0            999 V2000',
      '    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      'M  END',
    ].join('\n')
    expect(looksLikeMol(mol)).toBe(true)
  })
  it('rejects plain text', () => {
    expect(looksLikeMol('hello world')).toBe(false)
  })
})

describe('looksLikeSmiles', () => {
  it('accepts common SMILES', () => {
    expect(looksLikeSmiles('CCO')).toBe(true)
    expect(looksLikeSmiles('CC(=O)Oc1ccccc1C(=O)O')).toBe(true)
  })
  it('rejects sentences and numbers-only', () => {
    expect(looksLikeSmiles('hello world')).toBe(false)
    expect(looksLikeSmiles('42')).toBe(false)
  })
})

describe('isStructureCandidate', () => {
  it('true for smiles or mol', () => {
    expect(isStructureCandidate('c1ccccc1')).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd insight-studio && npm test -- --run tests/unit/structure/parse.spec.ts
```

Expected: FAIL (module missing)

- [ ] **Step 4: Implement parse.ts**

```ts
/** 轻量启发式：不调用 RDKit。用于导入推断与候选探测。 */

const SMILES_RE = /^[A-Za-z0-9@+\-\[\]\(\)=#$:/\\.%>~]+$/

export function looksLikeMol(text: string): boolean {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return false
  if (/M\s+END\s*$/im.test(t)) return true
  if (/V2000|V3000/i.test(t) && /\n/.test(t)) return true
  return false
}

export function looksLikeSmiles(text: string): boolean {
  const s = text.trim()
  if (!s || /\s/.test(s)) return false
  if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return false
  if (!SMILES_RE.test(s)) return false
  // 至少含一个字母（元素符号）；纯符号串排除
  if (!/[A-Za-z]/.test(s)) return false
  // 过短且无环/键标记的单字母留给普通文本（除常见元素单原子如 C、N、O、Cl 用长度>=2 或含括号/键）
  if (s.length === 1) return /^[CNOPSFIB]$/i.test(s)
  return true
}

export function isStructureCandidate(text: string): boolean {
  return looksLikeMol(text) || looksLikeSmiles(text)
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd insight-studio && npm test -- --run tests/unit/structure/parse.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add insight-studio/src/shared/types.ts \
  insight-studio/src/modules/table/structure/parse.ts \
  insight-studio/tests/unit/structure/parse.spec.ts
git commit -m "$(cat <<'EOF'
feat(insight-studio): 增加 structure 类型与 SMILES/mol 启发式探测

EOF
)"
```

---

### Task 2: CSV infer + coerce + import dropdown

**Files:**
- Modify: `insight-studio/src/modules/table/csv.ts`
- Modify: `insight-studio/tests/unit/csv.spec.ts`
- Modify: `insight-studio/src/modules/table/CsvImportDialog.vue`
- Modify: `insight-studio/src/modules/table/editing.ts`
- Modify: `insight-studio/src/modules/table/filterForm.ts`

**Interfaces:**
- Consumes: `isStructureCandidate` from `structure/parse.ts`
- Produces: `inferColumnType` may return `'structure'`; `coerceValue(_, 'structure')` → trimmed string | null

- [ ] **Step 1: Add failing csv tests**

Append to `tests/unit/csv.spec.ts`:

```ts
describe('inferColumnType · structure', () => {
  it('≥80% SMILES → structure', () => {
    expect(inferColumnType(['CCO', 'c1ccccc1', 'CC(=O)O', 'not a smiles', 'C'])).toBe('structure')
  })
  it('plain English stays string', () => {
    expect(inferColumnType(['hello world', 'foo bar', 'baz qux'])).toBe('string')
  })
  it('all numbers still number (priority over structure)', () => {
    expect(inferColumnType(['1', '2', '3'])).toBe('number')
  })
})

describe('coerceValue · structure', () => {
  it('trims string; empty → null', () => {
    expect(coerceValue('  CCO  ', 'structure')).toBe('CCO')
    expect(coerceValue('  ', 'structure')).toBe(null)
  })
})
```

- [ ] **Step 2: Run — expect FAIL on structure inference**

```bash
cd insight-studio && npm test -- --run tests/unit/csv.spec.ts
```

- [ ] **Step 3: Update `inferColumnType` and `coerceValue`**

In `csv.ts`:

```ts
import { isStructureCandidate } from './structure/parse'

export function inferColumnType(values: string[]): DataType {
  const nonEmpty = values.filter((v) => v.trim() !== '')
  if (nonEmpty.length === 0) return 'string'
  if (nonEmpty.every((v) => v.trim() !== '' && Number.isFinite(Number(v)))) return 'number'
  if (nonEmpty.every((v) => /^(true|false)$/i.test(v.trim()))) return 'boolean'
  if (nonEmpty.every((v) => DATE_ONLY_RE.test(v.trim()) && parseDateLike(v) !== null)) return 'date'
  if (nonEmpty.every((v) => DATETIME_RE.test(v.trim()) && parseDateLike(v) !== null)) return 'datetime'
  const hits = nonEmpty.filter((v) => isStructureCandidate(v)).length
  if (hits / nonEmpty.length >= 0.8) return 'structure'
  return 'string'
}

export function coerceValue(raw: string, type: DataType): CellValue {
  const s = raw.trim()
  if (s === '') return null
  switch (type) {
    // ...existing cases...
    case 'structure':
      return s
    default:
      return s
  }
}
```

Update file header comment to mention structure.

- [ ] **Step 4: CsvImportDialog typeOptions**

```ts
{ value: 'structure', label: 'Structure', icon: 'type-structure' },
```

(Icon added in Task 4; temporarily use `'type-text'` if Task 4 not done yet — prefer adding icon in Task 4 first or use `'type-text'` then swap.)

- [ ] **Step 5: editing + filterForm**

`editing.ts` `parseCellInput` — treat structure like string (keep raw, empty→null):

```ts
case 'structure':
  return { ok: true, value: s }
```

（放在 `default` 前；或让 `default` 覆盖即可，但显式 case 更清晰。）

`filterForm.ts`:

```ts
export function operatorsFor(dataType: DataType): OperatorDef[] {
  const ops =
    dataType === 'string' || dataType === 'structure'
      ? TEXT_OPS
      : dataType === 'boolean'
        ? BOOL_OPS
        : NUM_OPS
  return ops.map(def)
}
```

- [ ] **Step 6: Run csv + related unit tests PASS**

```bash
cd insight-studio && npm test -- --run tests/unit/csv.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add insight-studio/src/modules/table/csv.ts \
  insight-studio/src/modules/table/CsvImportDialog.vue \
  insight-studio/src/modules/table/editing.ts \
  insight-studio/src/modules/table/filterForm.ts \
  insight-studio/tests/unit/csv.spec.ts
git commit -m "$(cat <<'EOF'
feat(insight-studio): CSV 推断/coerce 支持 structure 列

EOF
)"
```

---

### Task 3: RDKit WASM loader + SVG render (mocked tests)

**Files:**
- Modify: `insight-studio/package.json` (add `@rdkit/rdkit`)
- Modify: `insight-studio/vite.config.ts`
- Create: `insight-studio/src/modules/table/structure/rdkit.ts`
- Create: `insight-studio/src/modules/table/structure/render.ts`
- Create: `insight-studio/tests/unit/structure/render.spec.ts`

**Interfaces:**
- Produces:
  - `ensureRdkit(): Promise<RDKitModule>`
  - `renderStructureSvg(text: string, opts?: { width?: number; height?: number }): Promise<{ ok: true; svg: string } | { ok: false; error: string }>`
  - `invalidateStructureCache(text?: string): void`

- [ ] **Step 1: Install dependency**

```bash
cd insight-studio && npm install @rdkit/rdkit
```

- [ ] **Step 2: Vite — copy wasm + vendor chunk**

In `vite.config.ts`:

1. Add `manualChunks` branch: `if (id.includes('@rdkit/rdkit')) return 'vendor-rdkit'`
2. Ensure WASM is served: either `vite-plugin-static-copy` from `node_modules/@rdkit/rdkit/dist/*.wasm` to `dist/`, **or** import URL pattern documented in rdkit.ts `locateFile`.

Recommended `rdkit.ts` locateFile:

```ts
locateFile: (file: string) => {
  if (file.endsWith('.wasm')) {
    return new URL('../../../../node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm', import.meta.url).href
  }
  return file
}
```

For production build, prefer copying wasm into `public/rdkit/` or using `?url` asset import — implement whichever works with `npm run build` verification in Task 5.

- [ ] **Step 3: Write failing render tests (mock RDKit)**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const get_mol = vi.fn()
vi.mock('../../../src/modules/table/structure/rdkit', () => ({
  ensureRdkit: vi.fn(async () => ({ get_mol })),
}))

import { invalidateStructureCache, renderStructureSvg } from '../../../src/modules/table/structure/render'

describe('renderStructureSvg', () => {
  beforeEach(() => {
    invalidateStructureCache()
    get_mol.mockReset()
  })

  it('returns svg and caches', async () => {
    const mol = { get_svg: () => '<svg>ok</svg>', delete: vi.fn() }
    get_mol.mockReturnValue(mol)
    const a = await renderStructureSvg('CCO', { width: 100, height: 80 })
    const b = await renderStructureSvg('CCO', { width: 100, height: 80 })
    expect(a).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(b).toEqual({ ok: true, svg: '<svg>ok</svg>' })
    expect(get_mol).toHaveBeenCalledTimes(1)
    expect(mol.delete).toHaveBeenCalled()
  })

  it('invalid mol → ok:false', async () => {
    get_mol.mockReturnValue(null)
    const r = await renderStructureSvg('%%%')
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 4: Implement rdkit.ts + render.ts**

`rdkit.ts` — singleton promise calling `initRDKitModule` from `@rdkit/rdkit`.

`render.ts` — LRU Map max 500; key = `${width}x${height}::${text}`; on miss call `get_mol`, `get_svg(width, height)` or `get_svg()` then delete mol; catch → `{ ok: false, error }`.

- [ ] **Step 5: Run render tests PASS**

```bash
cd insight-studio && npm test -- --run tests/unit/structure/render.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add insight-studio/package.json insight-studio/package-lock.json \
  insight-studio/vite.config.ts \
  insight-studio/src/modules/table/structure/rdkit.ts \
  insight-studio/src/modules/table/structure/render.ts \
  insight-studio/tests/unit/structure/render.spec.ts
git commit -m "$(cat <<'EOF'
feat(insight-studio): 接入 @rdkit/rdkit WASM 与结构 SVG 渲染缓存

EOF
)"
```

---

### Task 4: StructureCell + icons + DataGrid render

**Files:**
- Modify: `insight-studio/src/ui/icons.ts` — add `type-structure` (e.g. Lucide `Hexagon` or `Atom` if available; else `Grip`/`Grid3X3` is wrong — use `Hexagon`)
- Create: `insight-studio/src/modules/table/structure/StructureCell.vue`
- Modify: `insight-studio/src/modules/table/DataGrid.vue`
- Modify: `insight-studio/src/modules/table/CsvImportDialog.vue` — icon `type-structure`

**Interfaces:**
- Consumes: `renderStructureSvg`, `invalidateStructureCache`
- Produces: `<StructureCell :value="string | null" />`

- [ ] **Step 1: Add icon `type-structure`**

Map to Lucide `Hexagon` (import from `lucide-vue-next`).

- [ ] **Step 2: Implement StructureCell.vue**

Behavior:
- `value` null/'' → empty
- else async `renderStructureSvg(value, { width: 100, height: 80 })`
- loading → skeleton div
- ok → `v-html` sanitized SVG inside button/div; click opens `IPopover` with `<pre>` of original text
- fail → `IIcon name="warning"`; popover shows original + short error
- on `value` change, re-render; before unmount cancel stale async with generation counter

- [ ] **Step 3: Wire DataGrid**

In column `#default` slot:

```vue
<StructureCell v-if="col.dataType === 'structure'" :value="row[col.field] == null ? null : String(row[col.field])" />
<span v-else class="dg__cell" ...>{{ fmtCell(row, col) }}</span>
```

Header icon branch: `structure` → `type-structure`.

Row height: when any visible column is structure, set vxe `row-config.height` to ~88 (or only affect structure columns via cell class `dg__cell--structure` with min-height).

Edit path: existing text input; on successful commit for structure field call `invalidateStructureCache(String(old))` and `invalidateStructureCache(String(new))` if needed.

- [ ] **Step 4: Manual smoke (dev server)**

```bash
cd insight-studio && npm run dev
```

Import CSV with a SMILES column → should infer Structure → grid shows SVG.

- [ ] **Step 5: Commit**

```bash
git add insight-studio/src/ui/icons.ts \
  insight-studio/src/modules/table/structure/StructureCell.vue \
  insight-studio/src/modules/table/DataGrid.vue \
  insight-studio/src/modules/table/CsvImportDialog.vue
git commit -m "$(cat <<'EOF'
feat(insight-studio): DataGrid 结构列 RDKit SVG 缩略图渲染

EOF
)"
```

---

### Task 5: Change column type from header + verify

**Files:**
- Modify: `insight-studio/src/modules/table/DataGrid.vue` (header menu)
- Possibly: `insight-studio/src/modules/table/csv.ts` (`coerceValue` already used)

**Interfaces:**
- Produces: header action `setColumnDataType(field, next: DataType)` that mutates `table.columns[i].dataType` and, when leaving structure → other types, optionally coerce each row cell via `coerceValue(String(cell ?? ''), next)`.

- [ ] **Step 1: Header type menu**

On header type icon click (or ⋯ if already present): submenu listing Text / Number / Boolean / Date / Datetime / Structure.

On select:
1. `store.mutate` / `store.commit` with undo that restores previous `dataType` (+ previous cell values if coercing)
2. If new type is `structure`: only set `dataType`
3. If old was structure and new is number/date/…: for each row `row[field] = coerceValue(String(row[field] ?? ''), newType)`
4. Toast: `已将「{title}」设为 {label}`

- [ ] **Step 2: Typecheck + unit tests**

```bash
cd insight-studio && npx vue-tsc --noEmit && npm test -- --run
```

Expected: all PASS

- [ ] **Step 3: Build (wasm asset check)**

```bash
cd insight-studio && npm run build
```

Expected: success; `vendor-rdkit` chunk present; wasm reachable (no 404 when opening structure column in preview).

- [ ] **Step 4: Commit**

```bash
git add insight-studio/src/modules/table/DataGrid.vue
git commit -m "$(cat <<'EOF'
feat(insight-studio): 表头支持将列类型改为 structure

EOF
)"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| `DataType` + `'structure'` | 1 |
| Import auto-detect ≥80% | 2 |
| coerce trim / no RDKit on import | 2 |
| CsvImportDialog Structure option | 2 / 4 |
| `@rdkit/rdkit` WASM singleton | 3 |
| SVG + LRU cache | 3 |
| Thumbnail-only + popover original | 4 |
| Warning on parse fail | 4 |
| DataGrid structure branch | 4 |
| Post-import change type | 5 |
| Filter ops like string | 2 |
| Export CSV unchanged (original text) | already via `toCsv` — no change needed |
| No structure editor / SDF | out of scope |

## Placeholder scan

None intentional. Open constants: LRU 500, SVG 100×80, row height ~88 — locked in Task 3/4 steps above.
