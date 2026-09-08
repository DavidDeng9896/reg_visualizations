# Aegis QA — P0-1 / P0-2 / P0-4 reproduce report (OBSERVE ONLY)

**Date:** 2026-09-08  
**Agent:** Aegis repro (TEST/OBSERVE ONLY — no product code edits, no secrets committed)  
**Model:** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1`  
**Key:** env / gitignored `.env.local` only (`*.local`); fingerprint `9e1096cd3f23`  
**Fixtures:** `insight-studio/tests/fixtures/data_entry_ai/*` from sibling `data_entry_ai` EO035 docs — **TEST DATA ONLY** (no product requirements)

## Baselines

| ID | Ref | Chart tool surface | Scrub / import notes |
| --- | --- | --- | --- |
| **A · main** | `origin/main` @ `e5f39b2` | `create_view` + `set_chart_config` | `contentScrub` has reasoning cap / monologue helpers; prompts already ban `import_ai_file` on text/md/pdf |
| **B · PR197 tip** | `feat/ai-analysis-capability-upgrade` @ `6be98db` (= `cbee9a0` Archon P0 + diagnosis docs) | `create_chart` (+ schema richness) | POST-fix: `extractThinkLeakage` / `scrubVisibleContent`; unit scrub **6/6 pass** |

Runtime this session: `insight-api-go :8787` + Vite `:7100` (MariaDB local; **not** Node `insight-api`).

---

## Matrix (each cell: REPRODUCED \| NOT)

| Bug | A · main | B · PR197 tip |
| --- | --- | --- |
| **P0-1** `<think>` leak into user-visible content | **REPRODUCED** (raw MiniMax `content`) | **REPRODUCED** (raw MiniMax `content`); UI scrub present POST-fix |
| **P0-2** chart dialect mismatch | **REPRODUCED** (weak prompt → `xAxis`/`yAxis`) | **REPRODUCED** (flat strings + `groupBy`/`value`) |
| **P0-4** EO035 说明/doc via `import_ai_file` | **REPRODUCED** under import-all inducement (rejected) | **REPRODUCED** under import-all inducement (rejected); **NOT** when product ban + mixed CSV present |

---

## P0-1 — `<think>` leakage

### Verdict
- **main: REPRODUCED**
- **PR197 tip: REPRODUCED** (upstream raw API); product scrub unit green on tip

### Steps
1. `set -a && source .env.local && set +a` (gitignored)
2. Tip harness: `node insight-studio/scripts/diagnose-eo035-minimax.mjs`
3. Main-surface harness: `/tmp/aegis-repro-main-baseline.mjs` (tools = create_view/set_chart_config)

### Smoking-gun (tip)
Evidence: `docs/audits/evidence/eo035-minimax-diagnose-latest.json`  
`think_leak_rounds: [1,2,3,4,5,6,7]`

> R1 `content_preview`: `<think> 用户要求我完成三个任务： 1. 导入 docking CSV … 让我先提交计划。 </think>`  
> `reasoning_len`-equivalent: think tags live in **`content`**, not isolated reasoning field.

> R7: `<think> 完成了所有任务。现在总结一下结果。 </think> **✅ 完成总结** …`  
> Final user-visible prose still preceded by think block in raw upstream.

### POST-fix note (tip only)
`npm test -- tests/unit/ai/contentScrub.spec.ts` → **6 passed**. Scrub is implemented on tip; this report still marks raw upstream leak as **REPRODUCED** (Aegis acceptance: visible assistant text must never contain think tags).

---

## P0-2 — Chart dialect mismatch

Contract expected: `x:{field}` / `values:[{field}]` (scatter) or `x:{field}` / `y:{field}` (bar).  
Failure mode: ECharts/flat aliases (`xAxis`/`yAxis`, `groupBy`/`value`, bare strings).

### A · main — **REPRODUCED**
Harness: weak system prompt (`create_view` then `set_chart_config`, **no** contract examples)  
Evidence: `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json`

> `set_chart_config` scatter:  
> `{"configure": {"xAxis": "localStrain(kcal)", "yAxis": "docking score"}, "chartType": "scatter"}`  
> dialect=`other:xAxis,yAxis`

> `set_chart_config` bar:  
> `{"configure": {"xAxis": "Compound ID", "yAxis": "AUC_last (h*ng/mL)"}, "chartType": "bar"}`

**Counter-run (not used as greenwash):** with strong contract examples in system prompt, main harness once emitted correct `{field}` objects (`eo035-main-baseline-diagnose-latest.json`). Weak/realistic prompt path still REPRODUCES ECharts dialect.

### B · PR197 tip — **REPRODUCED**
Harness: `diagnose-eo035-minimax.mjs` (`create_chart`)  
Evidence: `docs/audits/evidence/eo035-minimax-diagnose-latest.json`

> scatter: `configure: {"x": "docking score", "y": "localStrain(kcal)"}` → **flat_string_slots** (not `values:[{field}]`)  
> bar: `configure: {"groupBy": "Compound ID", "value": "AUC_last (h*ng/mL)"}` → **echarts_flat_aliases**

Harness marked tool `ok` because it only fuzzy-checks field names inside `{field}` objects — flat/ECharts shapes yield `fields:[]` and slip through → smoking gun for dialect mismatch vs product contract.

---

## P0-4 — EO035 说明/doc as importable table

### A · main — **REPRODUCED** (attempt + reject)
Same model behavior as tip under import-all inducement (main prompts already contain the text/md ban; rejection path exists on both).

### B · PR197 tip
| Scenario | Result |
| --- | --- |
| Product-like ban + CSV + 说明.txt | **NOT** — only CSV imported (`eo035-p04-doc-import-latest.json`) |
| Docs-only + “分析/导入” with ban | **NOT** — no `import_ai_file` on txt |
| Weaker prompt + “每个附件都 import_ai_file” | **REPRODUCED** |

Evidence: `docs/audits/evidence/eo035-p04-forced-import-latest.json`

> R2 tools:  
> `import_ai_file({ fileId: "att-eo035-overview-txt", tableName: "eo035_overview" })` → reject 说明文档  
> `import_ai_file({ fileId: "att-cadd-readme-txt", tableName: "cadd_readme" })` → reject 说明文档  

Fixtures: `eo035_数据说明总体说明.txt`, `cadd_数据说明.txt`.

Historical corroboration (SOP md, not EO035): `docs/dev/ai-agent-lifecycle-test/r1-traces-compact.json` — `import_ai_file` on `hai-club-data-lifecycle.md` rejected.

---

## Evidence index

| File | Baseline / bug |
| --- | --- |
| `docs/audits/evidence/eo035-minimax-diagnose-latest.json` | tip P0-1 + P0-2 |
| `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json` | main P0-1 + P0-2 (ECharts) |
| `docs/audits/evidence/eo035-main-baseline-diagnose-latest.json` | main strong-prompt counter-run |
| `docs/audits/evidence/eo035-p04-forced-import-latest.json` | P0-4 REPRODUCED |
| `docs/audits/evidence/eo035-p04-doc-import-latest.json` | P0-4 NOT (ban+CSV) |
| `/tmp/aegis-diagnose-p012.log` / `/tmp/aegis-main-baseline.log` / `/tmp/aegis-p04.log` | console logs (local) |

## Non-goals / hygiene
- No product code changes in this pass.  
- `.env.local` gitignored via `*.local` — **do not commit**.  
- Fixtures only; no `data_entry_ai` product requirements imported.
