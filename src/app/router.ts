import { createRouter, createWebHistory } from 'vue-router'
import AnalysisListView from '@/modules/analysis/views/AnalysisListView.vue'
import AnalysisWorkspaceView from '@/modules/analysis/views/AnalysisWorkspaceView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'list', component: AnalysisListView },
    { path: '/analyses/:analysisId', name: 'workspace', component: AnalysisWorkspaceView, props: true },
  ],
})
