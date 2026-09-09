# Runtime diagnosis: EO035 fixtures + MiniMax (TEST DATA ONLY)

**Date:** 2026-09-08  
**Branch diagnosed:** `feat/ai-analysis-capability-upgrade` @ `cbee9a0` (includes Archon P0 commits already on branch; **this doc does not add feature fixes**)  
**Tracked PR:** [#197](https://github.com/DavidDeng9896/reg_visualizations/pull/197) (draft)  
**Model:** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1`  
**Secrets:** API key only via gitignored `.env.local` / process env — **never committed**  
**Fixtures:** `insight-studio/tests/fixtures/data_entry_ai/*` copied from sibling `data_entry_ai` EO035 docs — **TEST DATA ONLY** (no product requirements imported)

---

## 1. Goal of this pass

David’s order: Archon / agents must **observe the real runtime pipeline** on complex scientific tables before more implementation. This audit records what MiniMax + the current tool surface actually did on EO035-style CSVs.

**Out of scope here:** Task 2–5 product coding (scrub/catalog/join/idle feature work). Diagnosis + documentation only.

---

## 2. Repro steps

### 2.1 Environment

```bash
# repo root
set -a && source .env.local && set +a   # gitignored; *.local covered by .gitignore
# Confirm ignore:
git check-ignore -v .env.local
# Expect: .gitignore:*.local  .env.local
```

`.env.local` keys (do not commit):

- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL=https://api.minimaxi.com/v1`
- `MINIMAX_MODEL=MiniMax-M2.7-highspeed`

### 2.2 Live multi-turn diagnose (MiniMax + fixture CSV in prompt)

```bash
node insight-studio/scripts/diagnose-eo035-minimax.mjs
```

Writes redacted JSON:

- `docs/audits/evidence/eo035-minimax-diagnose-latest.json`
- timestamped copy under the same folder

Harness notes:

- Uses OpenAI-compatible `chat/completions` with a **subset** of studio tools (`submit_plan`, `import_csv_text`, `get_table_schema`, `create_chart`, …).
- Executes tools in a **local fake analysis** (not the Vue Pinia store) so we can observe tool **args** and field names without UI flakiness.
- Redacts keys; stores key SHA256 fingerprint only.

### 2.3 Local unit evidence (no network)

```bash
cd insight-studio
npm test -- tests/unit/ai/complexTableAnalysis.spec.ts \
  tests/unit/ai/contentScrub.spec.ts \
  tests/unit/ai/impl.spec.ts
```

Result this run: **52 passed** (see `docs/audits/evidence/content-scrub-unit.log` for scrub suite).

### 2.4 Configure-shape probe (live MiniMax args × product normalizer)

Live `create_chart` configure used **string** slots (`x: "docking score"`), not `{field:…}` objects. A one-shot vitest probe (not kept in tree) confirmed `normalizeAiChartConfigure` + `validateChartMapping` **accept** that shape for scatter/bar on docking + PK columns. Log: `docs/audits/evidence/probe-configure-shapes.log`.

---

## 3. What happened (by stage)

### 3.1 Intent understanding

| Observation | Evidence |
| --- | --- |
| Round 1 called `submit_plan` with chart-oriented steps (scatter + bar) | `tool_sequence` starts with `submit_plan`; findings.intent R1 |
| Plan skeleton matched user goals (docking scatter + PK bar + schema) | rounds[0] args in latest JSON |
| **Every round** MiniMax put `<think>…</think>` inside `content` (not only `reasoning_content`) | `think_leak_rounds: [1,2,3,4,5,6]` |
| Final round ended with prose summary still wrapped in think tags | round 6 `content_preview` |
| Only **one** `mark_step_done` despite multi-step plan | sequence ends `… → mark_step_done` once |

**Implication for UI:** Even with product scrub on the branch, **raw upstream** still leaks think into content. If scrub misses a round or content is persisted before scrub, users see reasoning walls / “正在生成” noise. Historical CAPABILITY-RESULTS (“plan 4/4 done, still 正在生成”) remains a risk when the model waits to emit closing prose with think tags.

### 3.2 Data / table understanding

| Observation | Evidence |
| --- | --- |
| Imported both CSVs with correct messy headers | `tables_imported`: `docking score`, `localStrain(kcal)`, `AUC_last (h*ng/mL)`, `Dose (mg/kg)`, … |
| Called `get_table_schema` **twice** before charting | R3 tools |
| Schema summaries included `field=\`…\`` tags | findings.schema R3 |
| Chart fields used **exact** header strings (including spaces/units) | R4 args: `docking score`, `localStrain(kcal)`, `Compound ID`, `AUC_last (h*ng/mL)` |
| Did **not** invent `docking_score` / drop units in this run | no schema finding for underscore form |
| Did not attempt Join (N/A for this prompt) | no `add_join_step` |

**Implication:** With rich schema text in the tool result, MiniMax grounded fields well on this short EO035 CSV pair. Remaining schema risks (from Archon plan / older AUDIT) are still: thin workspace context on **many** tables, Join without both ids, Excel multi-sheet / SOP md mis-import — **not exercised in this MiniMax run**.

### 3.3 Chart execution & display

| Observation | Evidence |
| --- | --- |
| Used `create_chart` twice (scatter + bar) after schema | R4 |
| Configure used **string shorthand** `x`/`y` instead of `{field}` / scatter `values[]` | R4 `args_preview` |
| Product normalizer accepts that shorthand → valid mapping | probe-configure-shapes.log |
| Harness marked charts configured = 2 | `charts_configured: 2` |
| **Not measured in this harness:** workspace auto-open, AiChartCard EMPTY_FIGURE, Plotly render in drawer | requires headed UI / Playwright |

**Implication:** On this fixture set, **intent→schema→create_chart args** look viable after normalize. Display-stage failures called out in the plan (empty figure card, no auto-open, idle after plan done) need a **UI/e2e** pass — this diagnose script cannot claim “chart actually showed in workspace.”

---

## 4. Tool sequence (this run)

```
submit_plan
→ import_csv_text ×2
→ get_table_schema ×2
→ create_chart ×2
→ list_tables
→ mark_step_done
→ (prose summary with <think>)
```

Expected skeleton match (import → schema → chart): **yes** for this prompt (~100% on skeleton; mark_step_done under-used).

---

## 5. Prioritized problem list for David

### P0 — still confirmed or high risk

1. **`<think>` leak in MiniMax `content` (all 6 rounds)**  
   - Runtime: raw API. Product has scrub helpers on this branch — **verify UI path still strips every round + history persistence**.  
   - Acceptance: visible assistant text never contains think tags; reasoning only in ReasoningCard.

2. **Plan-complete → idle / 「正在生成」**  
   - Not fully reproduced in headless harness; historically confirmed (CAPABILITY-RESULTS filter-chart).  
   - This run: model still spent a final round on think+prose after charts existed.  
   - Acceptance: when plan+chart deliverables met, `running=false` without waiting for prose.

3. **Chart display in workspace (auto-open + non-empty Plotly)**  
   - Args look OK after normalize; **display not proven** here.  
   - Acceptance: ≥1 bar/scatter visible in main workspace after agent finishes (Aegis A-Chart).

### P1 — schema / multi-table (not failing this short run, still in plan)

4. **Full TableCatalog every turn in real `aiStore`/`agentLoop`** — code present on branch; not separately load-tested with 10+ tables.  
5. **Join requires both tableIds** — gated in `impl` on branch; MiniMax did not call join this run.  
6. **Excel multi-sheet / messy CRO reports** — fixtures still mostly CSV; xlsx path not live-diagnosed here.

### P2 — intent quality

7. **Under-marking plan steps** (`mark_step_done` once).  
8. **Attachment role mistakes** (`import_ai_file` on md/SOP) — covered in older AUDIT, not in this CSV-only prompt.

---

## 6. Branch / PR hygiene

| Item | Status |
| --- | --- |
| PR #197 | Draft — design/plan + synced branch work |
| PR #198 | Closed (duplicate) — do not expand |
| Feature Task 2–5 | **Not implemented in this diagnosis commit** (branch may already contain Archon’s earlier P0; this commit is docs + diagnose script only) |
| Secrets | `.env.local` gitignored via `*.local` |

---

## 7. Ask for David (confirmation gate)

Please confirm before more coding:

1. Is **think-leak + idle + workspace chart visibility** still the P0 acceptance trio for Aegis?  
2. Should the next code slice be **UI/e2e proof** of chart display on these fixtures (headed), or more **schema/Join** stress with multi-table Excel?  
3. Treat current branch P0 commits as provisional until Aegis signs off?

---

## 8. Evidence index

| File | Contents |
| --- | --- |
| `docs/audits/evidence/eo035-minimax-diagnose-latest.json` | Full redacted multi-turn trace |
| `docs/audits/evidence/eo035-minimax-diagnose-2026-09-08T10-51-46.json` | Timestamped copy |
| `docs/audits/evidence/probe-configure-shapes.log` | Product normalizer accepts live configure shapes |
| `docs/audits/evidence/content-scrub-unit.log` | Unit scrub suite |
| `insight-studio/scripts/diagnose-eo035-minimax.mjs` | Repro harness (diagnosis only) |
| `insight-studio/tests/fixtures/data_entry_ai/` | TEST DATA fixtures |
