# Plotly Charts Migration Implementation Plan

> **For agentic workers:** Execute task-by-task. Preserve `runtime/palette.ts` colors exactly.

**Goal:** Replace ECharts with Plotly.js for all six chart types while reusing ChartConfig, panels, and palettes; keep fit overlays; defer lasso.

**Architecture:** Builders emit `{ data, layout, config }`; ChartPanel uses `Plotly.react`; palette via existing `seriesColor` / `getContinuousPalette`.

**Tech Stack:** Vue 3, Plotly.js (`plotly.js-dist-min`), Vitest, Playwright

## Global Constraints

- Keep categorical/continuous palette hex values unchanged (`palette.ts`)
- Do not change `ChartConfig` shape or panel UI bindings
- Lasso Flag/Clear: disable with tooltip; skip related e2e
- Fit overlays must render on scatter/line
- Remove `echarts` dependency when done

---

### Task 1: Dependencies + types + ChartPanel + export

**Files:** `package.json`, `vite.config.ts`, `types.ts`, `ChartPanel.vue`, `export.ts`

- Install `plotly.js-dist-min` + `@types/plotly.js`; remove `echarts`
- `ChartOption` = `{ data, layout, config? }`
- ChartPanel: newPlot/react/resize/toImage; ignore flagMode brush
- Vendor chunk `vendor-plotly`

### Task 2: shared + axis Plotly helpers

**Files:** `runtime/shared.ts`, `runtime/axis.ts`

- Replace ECharts title/legend/grid/axis fragments with Plotly layout helpers
- Keep `seriesColor`, `displayVal`, data utils, palette imports
- Map `resolveAxis` → Plotly axis (`type: 'log'|'linear'`, `range`, `title`)

### Task 3: Rewrite builders (pie→bar→line→scatter→box→heatmap)

**Files:** `runtime/{pie,bar,line,scatter,box,heatmap}.ts`

- Same inputs; output Plotly figure
- Colors only via `seriesColor` / continuous palette stops
- Scatter/line: fit overlays as line traces

### Task 4: ChartView lasso disable + tests

**Files:** `ChartView.vue`, `*Options.spec.ts`, `fitOverlay.spec.ts`, e2e chart/persistence

- Disable Flag/Clear with tooltip
- Update unit assertions to Plotly shapes
- Skip lasso e2e

### Task 5: Verify + commit

- `npm run typecheck && npm test`
- Commit on `use_plotly`
