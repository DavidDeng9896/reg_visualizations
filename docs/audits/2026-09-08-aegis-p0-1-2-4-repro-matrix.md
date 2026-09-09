# Aegis QA matrix — main vs PR197 tip (OBSERVE ONLY)

**Date:** 2026-09-08  
**Rule:** P0-2 and P0-4 reported **separately per baseline** — do not mix cells.  
**Model:** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1` (env / `.env.local` only; fingerprint `9e1096cd3f23`)  
**Fixtures:** `insight-studio/tests/fixtures/data_entry_ai/` (EO035 test data only)  
**Runbook:** `insight-api-go :8787` + Vite `:7100` (not Node insight-api)  
**No product code edits.**

## Baselines

| ID | Ref | Chart path |
| --- | --- | --- |
| **A · main** | `origin/main` @ `e5f39b2` | `create_view` + `set_chart_config` |
| **B · PR197 tip** | `feat/ai-analysis-capability-upgrade` @ `6be98db` | `create_chart` (+ richer schema) |

> Note (process only, not mixed into cells): tip includes Archon P0 `cbee9a04` (contentScrub etc.). David has not confirmed P0 list. PRE-fix lacked `extractThinkLeakage`; see prior section in git history if needed.

---

## Matrix

| Bug | A · main | B · PR197 tip |
| --- | --- | --- |
| **P0-1** think leak | **REPRODUCED** | **REPRODUCED** |
| **P0-2** chart dialect | **REPRODUCED** | **REPRODUCED** |
| **P0-4** doc-as-table | **REPRODUCED** | **REPRODUCED** |

---

## A · main — cell details

### P0-1 think leak — **REPRODUCED**
- **Steps:** MiniMax multi-turn with main tool surface (`create_view` / `set_chart_config`); inspect assistant `content` for `<think>`.
- **Evidence:** `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json` (`think_leak_rounds: [1,2,3,4]`); also `eo035-main-baseline-diagnose-latest.json` (`[1..5]`).
- **Smoking-gun:** R3 `content_preview`: `<think>\n创建视图成功，现在配置图表参数。\n</think>` — think tags in **`content`**.

### P0-2 chart dialect — **REPRODUCED**
- **Steps:** EO035 docking + mouse_pk CSV → `create_view` then `set_chart_config` with **weak** system prompt (no `{field}` examples).
- **Evidence:** `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json`
- **Smoking-gun:**
  - scatter: `configure: {"xAxis":"localStrain(kcal)","yAxis":"docking score"}`
  - bar: `configure: {"xAxis":"Compound ID","yAxis":"AUC_last (h*ng/mL)"}`
  - Expected contract: `x:{field}` / `values:[{field}]` or bar `y:{field}` — got ECharts `xAxis`/`yAxis`.

### P0-4 doc-as-table — **REPRODUCED**
- **Steps:** Attach `eo035_数据说明总体说明.txt` + `cadd_数据说明.txt` (`kind=text`); prompt to `import_ai_file` every attachment; `list_tables`.
- **Evidence:** `docs/audits/evidence/main-p04-doc-import-latest.json`
- **Smoking-gun:**
  - `import_ai_file({fileId:"att-eo035-overview-txt", tableName:"eo035_overview"})` → 说明文档拒绝
  - `import_ai_file({fileId:"att-cadd-readme-txt", tableName:"cadd_readme"})` → 说明文档拒绝

---

## B · PR197 tip — cell details

### P0-1 think leak — **REPRODUCED**
- **Steps:** `node insight-studio/scripts/diagnose-eo035-minimax.mjs` (tip `create_chart` harness).
- **Evidence:** `docs/audits/evidence/eo035-minimax-diagnose-latest.json`
- **Smoking-gun:** `think_leak_rounds: [1,2,3,4,5,6,7]`; R1 `<think> 用户要求我完成三个任务… </think>` in `content`.  
  (Product `extractThinkLeakage` exists on tip / unit 6/6 — does **not** erase raw upstream leak for this cell.)

### P0-2 chart dialect — **REPRODUCED**
- **Steps:** Same diagnose harness; inspect `create_chart` `configure` args vs contract.
- **Evidence:** `docs/audits/evidence/eo035-minimax-diagnose-latest.json` → `views[]`
- **Smoking-gun:**
  - scatter: `{"x":"docking score","y":"localStrain(kcal)"}` (flat strings; missing `values:[{field}]`)
  - bar: `{"groupBy":"Compound ID","value":"AUC_last (h*ng/mL)"}` (ECharts aliases)

### P0-4 doc-as-table — **REPRODUCED**
- **Steps:** Tip session: EO035 说明 txt attachments; prompt import every file via `import_ai_file`.
- **Evidence:** `docs/audits/evidence/eo035-p04-forced-import-latest.json`
- **Smoking-gun:** same two `import_ai_file` calls on `eo035_数据说明总体说明.txt` / `cadd_数据说明.txt` → rejected as 说明文档.  
  Separate tip run with product-like ban **+ CSV** did **not** import docs (`eo035-p04-doc-import-latest.json`) — not used to dilute this cell’s REPRODUCED under the import-all prompt.

---

## Evidence index (by baseline)

| Baseline | Files |
| --- | --- |
| A · main | `eo035-main-weak-prompt-diagnose-latest.json`, `eo035-main-baseline-diagnose-latest.json`, `main-p04-doc-import-latest.json` |
| B · tip | `eo035-minimax-diagnose-latest.json`, `eo035-p04-forced-import-latest.json` |
