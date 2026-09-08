# Aegis QA — P0-1 / P0-2 / P0-4 (OBSERVE ONLY) — PRE-fix vs POST-fix

**Date:** 2026-09-08  
**Process note:** David has **not** confirmed the P0 list yet. This report labels every result as **PRE-fix** vs **POST-fix** relative to Archon P0 commit `cbee9a04`. Closed PR198 head `5d3a4a63` is older (pre-Archon-P0 docs slice).  
**Model:** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1`  
**Secrets:** env / gitignored `.env.local` only (`*.local`); fingerprint `9e1096cd3f23` — never committed  
**Fixtures:** `insight-studio/tests/fixtures/data_entry_ai/*` (EO035 test data only — no data_entry_ai product requirements)  
**Runbook:** `insight-api-go :8787` + Vite `:7100` (not Node insight-api)

---

## Commit landmarks

| Label | SHA | Meaning |
| --- | --- | --- |
| **PRE-fix** | `5d3a4a63` (and any parent of `cbee9a04`) | No `extractThinkLeakage`; Archon scrub / TableCatalog / join gate / plan-idle **not** landed |
| **Archon P0** | `cbee9a04` | Claims: contentScrub think-strip, TableCatalog, join gate, plan idle |
| **POST-fix tip** | `6be98db` (= `cbee9a04` + diagnosis docs) | Current `feat/ai-analysis-capability-upgrade` tip used for live MiniMax repro this session |

Code fact (observe): `git grep extractThinkLeakage 5d3a4a63` → **none**. Present from `cbee9a04` onward (`contentScrub.ts`, `AiMessageList.vue`, `aiStore.ts`).

---

## Matrix — labeled PRE-fix / POST-fix

Live MiniMax harnesses this session ran against **POST-fix tip** tool surfaces (and main chart path). Upstream model behavior is also the PRE-fix failure mode where product scrub did not yet exist.

| Bug | PRE-fix (`< cbee9a04` / `5d3a4a63`) | POST-fix (`cbee9a04` / tip `6be98db`) |
| --- | --- | --- |
| **P0-1** `<think>` in user-visible content | **REPRODUCED** — raw MiniMax puts `<think>` in `content`; **no** `extractThinkLeakage` in product | **REPRODUCED** at raw API (same leak); product scrub **present** (unit 6/6) — UI path claims strip, **David not signed off** |
| **P0-2** chart dialect vs `x:{field}` / `values:[{field}]` | **REPRODUCED** (model emits ECharts/flat; `create_chart` already on pre-P0 feat tree) | **REPRODUCED** on tip `create_chart` + on main-style `set_chart_config` |
| **P0-4** EO035 说明 → `import_ai_file` | **REPRODUCED** as attempt+reject pattern (historical md SOP + this session forced import) | **REPRODUCED** under import-all inducement; **NOT** when product ban + CSV also attached |

---

## P0-1 — `<think>` leakage

### Steps
1. `set -a && source .env.local && set +a`
2. POST-fix tip: `node insight-studio/scripts/diagnose-eo035-minimax.mjs`
3. Confirm PRE-fix code lacks scrub: `git show 5d3a4a63:insight-studio/src/modules/ai/contentScrub.ts` has **no** `extractThinkLeakage`

### Smoking-gun (live POST-fix tip = upstream PRE behavior)
Evidence: `docs/audits/evidence/eo035-minimax-diagnose-latest.json`  
`think_leak_rounds: [1,2,3,4,5,6,7]`

> R1: `<think> 用户要求我完成三个任务： 1. 导入 docking CSV … 让我先提交计划。 </think>`  
> Tags are in **`content`**, not a separate reasoning field.

> R7: `<think> 完成了所有任务。现在总结一下结果。 </think> **✅ 完成总结** …`

### PRE-fix vs POST-fix interpretation
| Layer | PRE-fix | POST-fix |
| --- | --- | --- |
| MiniMax raw `content` | leak | leak (still) |
| Product `extractThinkLeakage` | **absent** → UI would show think | **present**; `contentScrub.spec.ts` **6 passed** on tip |
| Aegis acceptance | fail | raw still fails until UI path proven end-to-end; treat scrub as **unconfirmed by David** |

---

## P0-2 — Chart dialect mismatch

Contract: scatter `x:{field}` + `values:[{field}]`; bar `x:{field}` + `y:{field}`.  
Bad dialects: bare strings, `groupBy`/`value`, `xAxis`/`yAxis`.

### POST-fix tip (`create_chart`) — **REPRODUCED**
Evidence: `docs/audits/evidence/eo035-minimax-diagnose-latest.json`

> scatter: `{"x":"docking score","y":"localStrain(kcal)"}` → flat_string_slots  
> bar: `{"groupBy":"Compound ID","value":"AUC_last (h*ng/mL)"}` → echarts_flat_aliases  

Archon P0 did **not** claim to fix dialect; still broken POST-fix.

### main-style two-step path — **REPRODUCED** (weak prompt)
Evidence: `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json`

> `set_chart_config` → `{"xAxis":"localStrain(kcal)","yAxis":"docking score"}`  
> `set_chart_config` → `{"xAxis":"Compound ID","yAxis":"AUC_last (h*ng/mL)"}`

### PRE-fix note
`create_chart` already exists at `5d3a4a63`. Dialect mismatch is a **model×contract** issue independent of Archon scrub; live tip repro stands for both PRE and POST unless a later dialect normalizer is accepted as fix (not signed off).

---

## P0-4 — EO035 说明/doc as importable table

Fixtures: `eo035_数据说明总体说明.txt`, `cadd_数据说明.txt` under `insight-studio/tests/fixtures/data_entry_ai/`.

### Steps (POST-fix tip session)
1. Attach EO035 说明 txt as `kind=text` fileIds
2. Prompt: import **every** attachment via `import_ai_file`
3. Observe tool calls + reject summaries

### Smoking-gun — **REPRODUCED**
Evidence: `docs/audits/evidence/eo035-p04-forced-import-latest.json`

> `import_ai_file({ fileId:"att-eo035-overview-txt", tableName:"eo035_overview" })` → 说明文档拒绝  
> `import_ai_file({ fileId:"att-cadd-readme-txt", tableName:"cadd_readme" })` → 说明文档拒绝  

### Nuance
| Scenario | POST-fix result |
| --- | --- |
| Product ban + CSV + 说明 | **NOT** — only CSV imported (`eo035-p04-doc-import-latest.json`) |
| Docs-only + soft “分析” | **NOT** |
| Import-all inducement | **REPRODUCED** |

Historical PRE corroboration (SOP md): `docs/dev/ai-agent-lifecycle-test/r1-traces-compact.json` — `import_ai_file` on `hai-club-data-lifecycle.md` rejected.

Archon P0 did **not** remove the mis-intent; rejection path still burns a tool round POST-fix.

---

## Evidence index

| File | Role |
| --- | --- |
| `docs/audits/evidence/eo035-minimax-diagnose-latest.json` | POST-fix tip live: P0-1 + P0-2 |
| `docs/audits/evidence/eo035-main-weak-prompt-diagnose-latest.json` | main-style path: P0-2 ECharts `xAxis`/`yAxis` |
| `docs/audits/evidence/eo035-p04-forced-import-latest.json` | P0-4 REPRODUCED |
| `docs/audits/evidence/eo035-p04-doc-import-latest.json` | P0-4 NOT (ban+CSV) |
| `docs/audits/2026-09-08-eo035-minimax-runtime-diagnosis.md` | Prior diagnosis on tip including `cbee9a0` |

## Hygiene
- OBSERVE/TEST ONLY — no product code edits in this pass.  
- Do not commit `.env.local` / API keys.
