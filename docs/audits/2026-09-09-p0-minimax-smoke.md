# P0 MiniMax live smoke — 2026-09-09

**PR:** [#197](https://github.com/DavidDeng9896/reg_visualizations/pull/197)  
**Tip tested:** `c0cee48` (`feat/ai-analysis-capability-upgrade` / PR head)  
**Model:** `MiniMax-M2.7-highspeed` @ `https://api.minimaxi.com/v1`  
**Key:** present in gitignored `.env.local` only (`*.local`); fingerprint SHA256₁₂=`9e1096cd3f23` — **never committed**  
**Fixtures (TEST DATA ONLY):** `insight-studio/tests/fixtures/data_entry_ai/`  
**Do not merge** until David signs off.

---

## Verdict

| ID | Result | Notes |
| --- | --- | --- |
| **P0-1** | **PASS** | Raw MiniMax `content` leaked `<think>`; product scrub → bubble **zero** think tags; thinking captured for Reasoning |
| **P0-3** | **PASS** | Product hard-rejects `cadd_数据说明.txt`; live model called `import_ai_file` (would fail in product); **no** invent `import_csv_text` |
| **P0-2** | **PASS** | Product rejects ECharts `xAxis`/`series.data`; live `create_chart` with field mapping validated (`docking score` × `localStrain(kcal)`) |
| **P0-4** | **PASS*** | No bare empty `create_view`; live used `create_chart`; auto-open path helper OK. *Headed UI idle/drawer **not** Playwright-tested |
| **P0-5** | **PASS** | Product rejects hand-filled `series[].data`; live `add_join_step` included both tableIds; no fake series chart |

**Overall live smoke:** PASS (with P0-4 headed-UI caveat).

---

## Repro steps

```bash
# repo root — secrets only in gitignored .env.local
set -a && source .env.local && set +a
git check-ignore -v .env.local   # expect: .gitignore:*.local  .env.local

# Live P0 gate smoke (MiniMax network + product scrub/reject/mapping)
cd insight-studio
npx vitest run tests/unit/ai/live-p0-minimax-smoke.spec.ts

# Multi-turn EO035 diagnose (raw API tool sequence; redacted JSON)
cd ..
node insight-studio/scripts/diagnose-eo035-minimax.mjs
```

Evidence artifacts (redacted, no keys):

- `docs/audits/evidence/p0-minimax-smoke-latest.json`
- `docs/audits/evidence/eo035-minimax-diagnose-latest.json`

---

## Per-item detail

### P0-1 — think scrub

- Live prose turn: MiniMax put `<think>…</think>` inside `content` (also confirmed on diagnose rounds 1–6).
- `assistantBubbleText` / `extractThinkLeakage`: bubble preview has **no** think tags; `thinking_len=283` available for ReasoningCard.
- **Pass criterion met** for “bubbles have zero `<think>`”.

### P0-3 — 说明 alone

- Product: `isNonTabularAiFile` + fail copy for `cadd_数据说明.txt` — no `import_csv_text` /「生成数据表」guidance; invent path blocked by `NON_TABULAR_INVENT_CSV_FAIL`.
- Live: tools=`[import_ai_file]` only; `inventCsv=false`.
- **Pass.** (Product would hard-fail that `import_ai_file` call.)

### P0-2 — chart dialect

- Product: ECharts payload hard-fail string present; string slot `x:"docking score"` allowed.
- Live: `create_chart` with alias/field mapping → after normalize/resolve, `validateChartMapping` OK on docking columns.
- Offline docking string-slot mapping also OK.
- **Pass.** Workspace Plotly pixel proof not in this headless smoke (mapping validated).

### P0-4 — empty chart / idle / auto-open

- Product: `hasChartConfigurePayload` distinguishes incomplete vs complete; `analysisPathForArtifact` → `/analysis/...?...&viewId=...`.
- Live: `create_chart` only; `bareEmptyAttempt=false`.
- **Pass for gates.** Explicit **gap:** no headed Playwright for drawer close +「正在生成」idle + main workspace chart visibility.

### P0-5 — join + fake series

- Product: `series:[{data:[1,2,3]}]` rejected; `series:{field}` allowed.
- Live: `add_join_step` with both `leftTableId`/`rightTableId`; no hand-filled series chart attempt.
- **Pass.**

### Supporting diagnose (same session)

Tool sequence:

`submit_plan → import_csv_text×2 → list_tables → get_table_schema×2 → create_chart×2 → mark_step_done`

- `charts_configured: 2`
- `think_leak_rounds: [1,2,3,4,5,6]` (raw API — scrub is product responsibility; P0-1 smoke covers scrub)

---

## Honesty / residual risk

1. **Headed UI** (P0-4 full Aegis A-Chart: Plotly visible in workspace, idle not stuck) — **not executed** in this smoke.
2. Smoke uses MiniMax `chat/completions` + product pure/tool gates; it does **not** drive the full Vue Pinia `runAgent` loop in browser.
3. Secrets remain only in `.env.local` (gitignored).

**Recommendation:** Safe to proceed with review; do **not** merge until David accepts the headed-UI caveat or a follow-up Playwright pass lands.
