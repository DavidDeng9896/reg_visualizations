# Routes — 路由结构

> 路由配置：`insight-studio/src/app/router.ts`（vue-router 4，`createWebHistory`）。
> 入口：`src/app/main.ts` → `createApp(App).use(createPinia()).use(router)`。
> 根组件 `src/app/App.vue` 仅渲染 `<RouterView/>` + `<ToastHost/>`（无布局包裹）。

## 路由表

| Path | Name | 组件文件 | 布局 | 说明 |
|---|---|---|---|---|
| `/` | `analyses` | `src/modules/analyses/AnalysisListPage.vue` | 无共享布局（页内自带 `.page__header` 标题栏） | Analysis 列表：卡片网格（名称/表数/视图数/更新时间）+ 新建/重命名/删除弹窗 + 一键 Demo + 空态 |
| `/analysis/:id` | `workspace` | `src/modules/workspace/WorkspacePage.vue` | 自身即 App Shell（顶栏 + 侧栏 + 主区） | 工作区：`store.mode` 在 `WorkspaceMain`（表+图）与 `FlowchartMain`（流程图）间切换（非路由，`<KeepAlive>` 保状态）；`props: true` 注入 `id` |
| `/:pathMatch(.*)*` | `not-found` | `src/modules/analyses/NotFoundPage.vue` | 无 | 空态 + 返回列表按钮 |

注意：工作区内部的「表视图 / 流程图」切换**不走路由**，是 `analysisStore.mode` 状态驱动的组件切换（`WorkspacePage.vue` 中 `modeComponent` computed）。

## 路由配置全文（`insight-studio/src/app/router.ts`）

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'analyses',
    component: () => import('../modules/analyses/AnalysisListPage.vue'),
  },
  {
    path: '/analysis/:id',
    name: 'workspace',
    component: () => import('../modules/workspace/WorkspacePage.vue'),
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../modules/analyses/NotFoundPage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

## 应用入口（`insight-studio/src/app/main.ts`）

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import '../styles/tokens.css'
import '../styles/base.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

## 根组件（`insight-studio/src/app/App.vue`）

```vue
<script setup lang="ts">
import { ToastHost } from '../ui'
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
```
