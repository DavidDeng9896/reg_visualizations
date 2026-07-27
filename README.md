# Insight Analysis / reg_visualizations

科学数据工作空间：导入表格数据、步骤流程图、图表与看板。

## 应用

| 目录 | 说明 |
| --- | --- |
| [`insight-studio/`](./insight-studio/) | 前端（Vue 3） |
| [`insight-api/`](./insight-api/) | 数据持久化 API（SQLite 开发 / PostgreSQL 生产） |

## 快速开始

```bash
# 终端 1：API（长期保存数据内容）
cd insight-api && npm install && npm run dev   # :8787

# 终端 2：前端（.env.development 指向 API）
cd insight-studio && npm install && npm run dev  # :5173
```

不设 `VITE_API_BASE_URL` 时前端回退到浏览器 IndexedDB（Dexie）。

```bash
cd insight-studio && npm test && npm run build
cd insight-api && npm test
```

## 文档

全部文档在 [`docs/`](./docs/README.md)。数据长期保存与 flowchart 同步见  
[`docs/specs/2026-07-27-data-persistence-realtime-design.md`](./docs/specs/2026-07-27-data-persistence-realtime-design.md)。

## 技术栈

Vue3 · Vite · TypeScript · Pinia · vxe-table · Vue Flow · Plotly · Dexie · Hono · SQLite/PostgreSQL
