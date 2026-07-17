import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { focusAfterNavigation } from '@/shared/ui/routeFocus'

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

router.afterEach((_to, _from, failure) => {
  if (failure) return
  void nextTick(() => {
    focusAfterNavigation()
  })
})
