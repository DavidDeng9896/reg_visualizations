import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'list',
      component: () => import('@/modules/analysis/views/AnalysisListView.vue'),
    },
    {
      path: '/analyses/:analysisId',
      name: 'workspace',
      component: () => import('@/modules/analysis/views/AnalysisWorkspaceView.vue'),
      props: true,
    },
  ],
})
