# Insight Analysis Implementation Plan

> **For agentic workers:** Execute sequentially S1→S5; update `docs/dev/insight-analysis-progress.md` after each slice. User wants full end-to-end product; do not stop for intermediate approval.

**Goal:** Ship a pure-frontend Insight Analysis workspace (Vue3) covering Analysis CRUD, CSV/Combine tables, editable grid, nested views/transforms, Vue Flow navigation, and ECharts charts aligned with `docs/features/charts/`.

**Architecture:** Single Vite SPA; Pinia + Dexie; domain modules under `src/modules/*`; Repository interface over IndexedDB.

**Tech Stack:** Vue3, Vite, TS, Vue Router, Pinia, Element Plus, vxe-table, @vue-flow/core, echarts, dexie, papaparse, vue-tsc, vitest.

## Global Constraints

- Pure frontend; Dexie DB name `insight-analysis`
- Element Plus + vxe-table; no cell merge
- Double-click cell edit; Excel-like copy/paste/insert/delete rows
- Flowchart: drag positions only; topology from data model
- Charts: ECharts; Save/Cancel; chartPosition top/bottom/left/right
- Registry/Plate/Send output/Connect external: stubs only
- UI: Chinese primary labels; keep Flowchart / Add data / CONFIGURE / STYLE where familiar
- Memory doc must stay current

## File map (target)

```text
package.json, vite.config.ts, tsconfig*.json, index.html
src/
  main.ts, App.vue, env.d.ts
  app/router.ts, app/layouts/AppShell.vue
  shared/types/analysis.ts
  shared/db/dexie.ts, shared/db/repository.ts
  shared/mock/projects.ts
  modules/analysis/{stores,views,components}
  modules/sidebar/*
  modules/table/{csv,join,EditableGrid,dialogs}
  modules/transform/{pipeline,ops}
  modules/flowchart/{FlowchartCanvas,nodes}
  modules/chart/{runtime,panels,fit,export}
tests/unit/{join,transform,fit}.spec.ts
```

---

### Task S1: Scaffold + Analysis shell + Dexie

**Files:** create all under `src/app`, `src/shared`, `src/modules/analysis`, `src/modules/sidebar` (placeholder)

- [ ] Scaffold Vite vue-ts at repo root; add deps
- [ ] Types + Dexie schema + repository
- [ ] Mock projects; Analysis list + create dialog; workspace layout shell
- [ ] Verify: create analysis → reload → still listed; `npm run build`
- [ ] Update progress doc; commit

### Task S2: Tables CSV + Combine + EditableGrid

- [ ] CSV upload dialog (papaparse) → AnalysisTable
- [ ] Combine dialog (joins + append)
- [ ] EditableGrid: double-click edit, copy/paste, insert/delete rows, no merge
- [ ] Unit tests: join/append
- [ ] Update progress; commit

### Task S3: Views + filters + transforms + promote

- [ ] Sidebar tree nested views; New view; rename; delete
- [ ] Pipeline: tableFilters → viewFilters → transforms
- [ ] Transforms: select/rename/derived/dedupe/sort
- [ ] Promote view → table; edit write-back rules
- [ ] Unit tests: transform pipeline
- [ ] Update progress; commit

### Task S4: Flowchart

- [ ] Vue Flow canvas; derive nodes/edges; persist layout
- [ ] Click → workspace; jump from sidebar; drag save positions
- [ ] Update progress; commit

### Task S5: Charts full path

- [ ] ChartRuntime registry for 6 types; CONFIGURE/STYLE panels
- [ ] FitEngine + lasso flags + model tables (line/scatter)
- [ ] Export PNG/PDF; sampling N=10000; chartPosition
- [ ] Unit tests: fit linear/quadratic basics
- [ ] E2E smoke manually; `npm run build` + `npm run dev` verify
- [ ] Final progress update; push; open PR

## Spec coverage check

| Spec area | Task |
| --- | --- |
| §2 IA/layout | S1 |
| §3 model/Dexie | S1 |
| §4 CSV/combine | S2 |
| §5 editable table | S2 |
| §6 views/transforms | S3 |
| §7 flowchart | S4 |
| §8 charts | S5 |
| stubs | S1–S2 menus |
