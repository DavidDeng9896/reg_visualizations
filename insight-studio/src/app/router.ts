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
