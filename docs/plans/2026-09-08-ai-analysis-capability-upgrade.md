# AI Analysis Capability Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Insight Studio AI analysis usable on complex scientific data by fixing intent understanding, table/schema grounding, and chart execute/display reliability — verified on EO035-style fixtures with MiniMax-M2.7-highspeed (Aegis).

**Architecture:** Keep the frontend ReAct loop (`agentLoop` + `tools/impl`) and Go OpenAI-compatible proxy. Add a thin contract layer before/around the tool loop: `AnalysisIntent` → every-turn `TableCatalog` → validated `ChartSpec` + render gate. No backend business orchestration rewrite.

**Tech Stack:** Vue 3 / Pinia (`insight-studio`), Go SSE proxy (`insight-api-go`), Plotly charts, OpenAI-compatible chat (MiniMax via `/api/ai/config` or env — never committed keys).

**Companion investigation:** `docs/ai-analysis-capability-upgrade.md` (pipeline map + broader options). This plan is the actionable failure-chain → fix → acceptance slice.

## Global Constraints

- Design/code must never commit API keys; configure via UI `PUT /api/ai/config` or env (`MINIMAX_API_KEY` / `OPENAI_API_KEY` + `OPENAI_API_BASE`) only.
- Prefer surgical edits in existing AI modules; do not relocate ReAct to the backend.
- Fixtures from `DavidDeng9896/data_entry_ai` `doc/EO035` go under `tests/fixtures/data_entry_ai/` (submodule or curated copy + README pointing at source).
- Acceptance model for Aegis: `MiniMax-M2.7-highspeed` @ compatible base URL (documented in `docs/dev/ai-agent-lifecycle-test/MINIMAX-M2.7-20260902.md`).
- Resume/continue paths: forbid `create_analysis`; reuse tables via `list_tables` / `get_table_schema`.

---

## 0. David’s three complaints → failure chains (in-repo evidence)

Evidence bases (do not re-audit from scratch):

- `docs/dev/ai-agent-lifecycle-test/AUDIT.md` — complex SOP lifecycle (HAI / hlx69)
- `docs/dev/ai-agent-lifecycle-test/CAPABILITY-RESULTS.md` — short capability matrix + filter-chart idle timeout
- `docs/dev/ai-agent-lifecycle-test/MINIMAX-M2.7-20260902.md` — MiniMax think-tag leak + Custom Code drawer clash
- Runtime: AI in `insight-studio/src/modules/ai/*`; proxy/skills/memory/aifiles in `insight-api-go/internal/api/ai*.go`

### Complaint 1 — Poor intent understanding

| Failure chain | Evidence | Fix (this plan) |
| --- | --- | --- |
| Free-text `submit_plan` ≠ SOP deliverables; agent marks steps done without charts / >3× alerts | AUDIT §2: tables exist, **无图表/看板**; BLI repeats without reminder | `AnalysisIntent` schema + deliverable gate before `done` |
| Wrong tool: `import_ai_file` on `.md` SOP | AUDIT §4 P2; traces `hai-club-data-lifecycle.md` | Intent classifier tags attachment roles; harden import rejection + prompt |
| MiniMax puts `<think>…</think>` in `content`, not `reasoning_content` | MINIMAX §3.1 | Scrub in `contentScrub` / SSE path before UI + before next-round messages |
| Plan complete but UI stuck「正在生成」; ask_user / idle state fuzzy | CAPABILITY-RESULTS filter-chart: 4/4 done, idle 180s timeout | End loop when plan+deliverables complete even without closing prose; tighten running/idle machine |
| Resume recreates analysis → stale tableIds | AUDIT §4 P1 | Strengthen continue-task system message + tool hard-fail `create_analysis` while resumable |

### Complaint 2 — Poor table/schema understanding

| Failure chain | Evidence | Fix (this plan) |
| --- | --- | --- |
| Workspace context thin (≤6 tables × 3 rows); `get_table_schema` underused | `context.ts`; AUDIT multi-table confusion | Inject full `TableCatalog` every turn |
| Multi-table join picks wrong tables | CAPABILITY-MATRIX / product gap notes; P1 risk on complex runs | Require explicit `leftTableId`/`rightTableId`; schema grounding before mutate |
| Custom Code IOData / port naming (`Output dataset` vs `datasets`) | AUDIT P0 (partially fixed via `tableOutputPortName`) | Keep regression tests; surface clearer tool errors if port resolve fails |
| Agent lacks `aggregate` / `pivot` / `bin` / `sort` tools though step defs exist | CAPABILITY-RESULTS §A product gap | Document as known gap; optional thin tools later — do not block P0 intent/schema/chart |
| Complex CRO Excel not in-repo as fixtures | data_entry_ai `doc/EO035` | Copy/submodule into `tests/fixtures/data_entry_ai/` |

### Complaint 3 — Chart analysis execute/display fails

| Failure chain | Evidence | Fix (this plan) |
| --- | --- | --- |
| Short tests pass `create_view`/`set_chart_config`; complex runs often **no chart** | AUDIT vs CAPABILITY-RESULTS filter-chart | `ChartSpec` validated (normalize + `validateChartMapping` + trial `buildChartOption`) before success artifact |
| UI「正在生成」after plan done | CAPABILITY-RESULTS filter-chart | Stop running when plan complete / deliverables met without waiting for prose |
| Main area does not auto-open chart/table | DESIGN / AUDIT: agent rarely opens workspace | Auto-open latest chart/table artifact on successful configure |
| `AiChartCard` silent catch →「图表构建失败」 | `AiChartCard.vue` | Surface Plotly/build error string to UI + tool summary |
| Custom Code panel vs AI drawer z-index | MINIMAX §3 / UX notes | CSS stacking fix so panel remains operable |

---

## 1. Files likely to change

### insight-studio (primary)

| Area | Paths |
| --- | --- |
| Agent loop / state | `src/modules/ai/agentLoop.ts`, `taskState.ts`, `aiStore.ts` |
| Intent | **new** `src/modules/ai/analysisIntent.ts` (+ unit tests) |
| Prompts / scrub | `prompts.ts`, `contentScrub.ts`, `client.ts` (`readSseStream`) |
| Schema catalog | `context.ts`, **new** `tableCatalog.ts`, `tools/impl.ts` (`list_tables`, `get_table_schema`, `add_join_step`) |
| Chart | `normalizeChartConfigure.ts`, `tools/impl.ts` (`create_view`, `set_chart_config` or new `upsert_chart`), `AiChartCard.vue`, `ArtifactCard.vue`, `charts/registry.ts` (trial build) |
| Tools registry | `tools/registry.ts`, `traceLabels.ts` |
| Resume / create | `tools/impl.ts` (`create_analysis`), `taskState.ts` (`continueTaskSystemMessage`) |
| UX idle / open | `aiStore.ts`, `AiDrawer.vue` / router open helpers, shell z-index CSS near Custom Code panel |
| Fixtures / tests | `tests/fixtures/data_entry_ai/**`, `tests/unit/ai/*`, `tests/e2e/ai.spec.ts`, optional `docs/dev/ai-agent-lifecycle-test/run-*.mjs` |

### insight-api-go (secondary)

| Area | Paths |
| --- | --- |
| Config env bootstrap (optional P2) | `internal/api/ai.go`, `.env.example` — read `MINIMAX_API_KEY` / `OPENAI_API_KEY` + `OPENAI_API_BASE` when file config empty; **never log raw keys** |
| Usually untouched for P0 | conversations, skills, aifiles — keep as-is unless attachment metadata needs role hints |

### Node mirror (only if still dual-maintained)

- `insight-api/src/ai.ts` — match env bootstrap if Go changes land.

---

## 2. Contracts to add

```ts
/** AnalysisIntent — compiled once per user turn (or on continue with prior intent). */
interface AnalysisIntent {
  goals: Array<'ingest' | 'transform' | 'chart' | 'stat' | 'dashboard' | 'report' | 'clarify'>
  planHints: string[]           // expected tool sequence hints for eval ≥80%
  deliverables: Array<
    | { kind: 'table'; nameHint?: string; minRows?: number }
    | { kind: 'chart'; chartType: 'bar' | 'scatter' | 'line' | string; titleHint?: string }
    | { kind: 'alert'; rule: 'bli_gt_3x' | string }
  >
  attachmentPolicy: Array<{ fileId: string; role: 'sop_readonly' | 'importable' | 'image' }>
  forbidCreateAnalysis?: boolean // true on resume
}

/** TableCatalog — injected every agent turn as system message. */
interface TableCatalogEntry {
  id: string
  name: string
  rowCount: number
  columns: Array<{ field: string; title: string; dataType: string }>
  sampleRows: Record<string, unknown>[] // ≤3
}

/** ChartSpec — must pass validate + trial buildChartOption before ok artifact. */
interface ChartSpec {
  tableId: string
  viewId?: string
  chartType: string
  configure: Record<string, unknown>
  style?: Record<string, unknown>
}
```

---

## 3. Implementation tasks

### Task 1: Fixtures from data_entry_ai EO035

**Files:**
- Create: `tests/fixtures/data_entry_ai/README.md` (source URL, license note, how to refresh)
- Create: `tests/fixtures/data_entry_ai/EO035/` — curated subset or submodule pointer covering:
  - CADD csv dir sample(s)
  - ≥1 HCT116 xlsx
  - ≥1 鼠 PK / ADME xlsx
  - `数据说明.txt`
- Test: document path only this task; later tasks consume fixtures

**Interfaces:**
- Produces: stable relative paths under `tests/fixtures/data_entry_ai/` for e2e/live scripts

- [ ] **Step 1:** Add README with clone/submodule instructions from `DavidDeng9896/data_entry_ai` `doc/EO035`
- [ ] **Step 2:** Vendor or submodule a **minimal** subset (avoid dumping entire树 if size blows CI); prefer LFS or CI download script if binaries are huge
- [ ] **Step 3:** Commit README + script/paths; confirm no secrets

### Task 2: Scrub MiniMax `<think>` + reasoning path

**Files:**
- Modify: `insight-studio/src/modules/ai/contentScrub.ts`
- Modify: `insight-studio/src/modules/ai/client.ts` (optional strip on assistant content before persist)
- Modify: `insight-studio/src/modules/ai/aiStore.ts` (apply scrub on visible assistant content)
- Test: `insight-studio/tests/unit/ai/contentScrub.spec.ts` (create or extend)

**Interfaces:**
- Produces: `scrubThinkTags(text: string): string`; visible content never shows raw `<think>` blocks

- [ ] **Step 1:** Write failing test — input with `<think>secret</think>答案` → visible `答案`, reasoning gets think body if desired
- [ ] **Step 2:** Implement strip (non-greedy, multi-block); keep `reasoning_content` path intact
- [ ] **Step 3:** Apply in store event path so MiniMax leaks do not enter next-round user-visible history
- [ ] **Step 4:** Commit

### Task 3: TableCatalog every turn + schema grounding

**Files:**
- Create: `insight-studio/src/modules/ai/tableCatalog.ts`
- Modify: `context.ts`, `aiStore.ts` (inject catalog each `runAgent` / continue)
- Modify: `tools/impl.ts` — enrich `get_table_schema`; `add_join_step` hard-require both table ids (no silent default to “last table” for join)
- Modify: `prompts.ts` — short rule: “before filter/join/chart, read TableCatalog / get_table_schema; never guess ids”
- Test: `tests/unit/ai/tableCatalog.spec.ts`, extend `impl.spec.ts` for join without ids → fail

**Interfaces:**
- Produces: `buildTableCatalog(analysis): string` (markdown or JSON fence)
- Consumes: `Analysis.tables`

- [ ] **Step 1:** Unit test catalog includes id, name, dtypes, 3-row sample, row count for all tables (not only first 6)
- [ ] **Step 2:** Implement builder with token budget (full catalog summaries; truncate samples first)
- [ ] **Step 3:** Inject as system message every turn in `aiStore` (send + continueTask)
- [ ] **Step 4:** `add_join_step`: if missing `leftTableId` or `rightTableId`, `fail` with explicit message (no pickDefaultTable for join)
- [ ] **Step 5:** Commit

### Task 4: AnalysisIntent before tool loop

**Files:**
- Create: `insight-studio/src/modules/ai/analysisIntent.ts`
- Modify: `aiStore.ts` — compile intent after attachments classified, before `runAgent`
- Modify: `agentLoop.ts` / `taskState.ts` — deliverable gate: plan done ∧ charts/alerts unsatisfied ⇒ nudge, not `done`
- Modify: `tools/impl.ts` — `create_analysis` rejects when `forbidCreateAnalysis` / resume checkpoint active
- Modify: `prompts.ts` — reference Intent block; attachment roles
- Test: `tests/unit/ai/analysisIntent.spec.ts`, agentLoop deliverable nudge tests

**Interfaces:**
- Produces: `compileAnalysisIntent(input): AnalysisIntent` (heuristic + optional short model call later)
- Consumes: user text, attachment kinds, resume flag

- [ ] **Step 1:** Define types + pure compiler (md/pdf → `sop_readonly`; csv/xlsx → `importable`; chart keywords → deliverable chart)
- [ ] **Step 2:** Inject Intent JSON as system message; set `forbidCreateAnalysis` on continueTask
- [ ] **Step 3:** Gate `done`: if deliverables include chart and no successful chart artifact this run → plan nudge
- [ ] **Step 4:** Hard-fail `create_analysis` when resume/forbid flag set (mirror continue message)
- [ ] **Step 5:** Commit

### Task 5: ChartSpec validation + auto-open + end-loop

**Files:**
- Modify: `tools/impl.ts` (`set_chart_config` and/or new `upsert_chart`)
- Modify: `normalizeChartConfigure.ts`
- Modify: `AiChartCard.vue` — show error message
- Modify: `aiStore.ts` / `ArtifactCard.vue` — auto-navigate to analysis+view on chart artifact success
- Modify: `agentLoop.ts` — if plan complete and deliverables met, finish even with empty assistant prose; clear `running`
- Test: `normalizeChartConfigure` / impl chart tests; e2e ai chart open

**Interfaces:**
- Produces: tool ok only if `validateChartMapping` empty **and** trial `buildChartOption` does not throw
- Produces: UI leaves「正在生成」when loop returns

- [ ] **Step 1:** In `set_chart_config` (or `upsert_chart`), after mutate, trial-build option; on failure rollback or fail without “配置完成”
- [ ] **Step 2:** AiChartCard displays `failedReason` string
- [ ] **Step 3:** On chart artifact push, `router.push` to `/analysis/:id?table=&view=` (reuse ArtifactCard open)
- [ ] **Step 4:** agentLoop: when `!planIncomplete && deliverablesSatisfied`, emit `done` even if content empty; ensure store sets `running=false`
- [ ] **Step 5:** Commit

### Task 6: Drawer vs Custom Code z-index

**Files:**
- Modify: Custom Code panel / AI drawer CSS (`CustomCodePanel.vue`, `AiDrawer.vue`, or shared shell z-index tokens)
- Test: manual or playwright smoke from MINIMAX script notes

- [ ] **Step 1:** Reproduce stacking (drawer above panel controls)
- [ ] **Step 2:** Fix z-index / inert so Custom Code AI + save remain clickable when global drawer open (or auto-dock drawer)
- [ ] **Step 3:** Commit

### Task 7: Optional Go env bootstrap for Aegis

**Files:**
- Modify: `insight-api-go/internal/api/ai.go`, `.env.example`
- Test: `ai_test.go` with `t.Setenv`

- [ ] **Step 1:** If config file has empty apiKey, fill from `MINIMAX_API_KEY` or `OPENAI_API_KEY`; baseUrl from `OPENAI_API_BASE`
- [ ] **Step 2:** Document in `.env.example` with empty placeholders only
- [ ] **Step 3:** Commit

### Task 8: Aegis acceptance harness

**Files:**
- Create/extend: `docs/dev/ai-agent-lifecycle-test/run-aegis-eo035.mjs` (or under `insight-studio/scripts/`)
- Use fixtures from Task 1; configure model via API/env only
- Record: tool sequence JSON (no keys), screenshots optional

**Acceptance checks (must pass on MiniMax-M2.7-highspeed):**

| ID | Criterion |
| --- | --- |
| A-Intent | EO035-style prompt → planned/executed tool sequence matches expected skeleton ≥80% (import → schema → transform/chart; no `import_ai_file` on txt/md) |
| A-Schema | Before mutate: `list_tables` or catalog present; `get_table_schema` or catalog columns used; join calls include both table ids; no wrong-table join on multi-table analysis |
| A-Chart | After agent finishes: ≥1 bar or scatter view visible in **workspace** (not only failed card); UI not stuck「正在生成」 |

- [ ] **Step 1:** Define expected tool skeleton for one EO035 prompt in script comments
- [ ] **Step 2:** Run against local stack with env/API config
- [ ] **Step 3:** Store redacted results under `docs/dev/ai-agent-lifecycle-test/` (no keys)
- [ ] **Step 4:** Commit results doc only

---

## 4. Suggested PR slices (after this design pass)

1. Think scrub + loop idle fix + AiChartCard errors (Task 2 + part of 5)  
2. TableCatalog + join id hard-require (Task 3)  
3. AnalysisIntent + deliverable gate + forbid create on resume (Task 4)  
4. ChartSpec trial-build + auto-open (Task 5)  
5. Fixtures + Aegis harness (Tasks 1 + 8)  
6. z-index + env bootstrap (Tasks 6–7)

---

## 5. Out of scope (this upgrade wave)

- Implementing aggregate/pivot/bin/sort agent tools (track separately; noted product gap).
- Moving ReAct to Go.
- Committing live MiniMax/OpenAI keys.
- Full vendor of entire EO035 tree if size breaks CI (use curated subset).

---

## 6. Spec coverage self-check

| User requirement | Task |
| --- | --- |
| Intent classifier / AnalysisIntent before tool loop | Task 4 |
| Scrub think tags | Task 2 |
| Strengthen schema+samples; forbid create_analysis on resume | Tasks 3–4 |
| TableCatalog every turn; join ids; schema before chart/filter | Task 3 |
| EO035 fixtures under tests/fixtures/data_entry_ai/ | Task 1 |
| ChartSpec; auto-open; end loop when plan complete; Plotly errors | Task 5 |
| Aegis MiniMax acceptance | Task 8 |
| Files list studio + go | §1 |
| Design only this pass | This document only |
