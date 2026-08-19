# Custom Code Scientific Runtime Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Custom Code a truthful scientific runtime (packages + read-only Python charts + AI empty-node sweep).

**Architecture:** One `requirements.txt` for worker; frontend package constant matches health names; stable `chartId = stepId::name` drives flowchart / report / dashboard; agent loop calls internal `cleanup_failed_ai_steps`.

**Tech Stack:** Python FastAPI worker, Vue 3 + Vitest, existing Plotly ChartPanel.

## Global Constraints

- No runtime pip. No flowkit/pycorn/allotropy.
- matplotlib Figure is not a chart node.
- Native 4PL unchanged.
- AI empty-node sweep only for `__createdBy === 'ai'` placeholder/failed-empty steps.
- chartId must survive Custom Code reruns.

See spec: `docs/superpowers/specs/2026-08-19-custom-code-scientific-runtime-design.md`

### Task 1: Package list + worker health
### Task 2: Stable chartId + flowchart python-chart nodes
### Task 3: Report + dashboard embed
### Task 4: AI createdBy + empty-node sweep
### Task 5: Prompts, templates, docs; verify tests
