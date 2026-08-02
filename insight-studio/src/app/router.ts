import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'insights',
    component: () => import('../modules/analyses/AnalysisHomePage.vue'),
  },
  {
    path: '/insights',
    redirect: '/',
  },
  {
    path: '/dashboards/:id?',
    name: 'dashboards',
    component: () => import('../modules/dashboard/DashboardShellPage.vue'),
    props: true,
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
