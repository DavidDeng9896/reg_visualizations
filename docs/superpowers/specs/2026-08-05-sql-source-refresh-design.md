# SQL 数据源刷新 → flowchart 同步（MVP）

## 问题

外部库导入是一次性快照；库内数据变化后 flowchart 不会自动更新。

## 方案

1. **手动「刷新数据源」**：对 `query-sql` 步骤重新执行 SQL，原地替换产出表行，复用既有 `propagateTableEdit`（下游 stale → 自动重跑）。
2. **可选自动刷新**：步骤 `config.autoRefresh=true` 时，打开分析页约每 2 分钟轮询刷新。
3. **连接档案**：`connectionId` 写入 step.config；密码仍只在 localStorage。

## 非目标

CDC / webhook / 真·推送；密码进 Analysis 文档；把表变成 live query 视图。
