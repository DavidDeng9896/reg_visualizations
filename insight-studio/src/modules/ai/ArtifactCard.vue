<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IIcon } from '../../ui'
import { useAiStore } from './aiStore'
import AiChartCard from './AiChartCard.vue'
import type { Artifact } from './types'

/** 产物卡片：名称 + 类型徽标 + （视图）图表预览，点击直达工作区。 */
const props = defineProps<{
  artifact: Artifact
}>()

const router = useRouter()
const ai = useAiStore()

const typeMeta = computed(() => {
  switch (props.artifact.kind) {
    case 'analysis':
      return { icon: 'database' as const, label: '分析' }
    case 'table':
      return { icon: 'table' as const, label: '表' }
    case 'view':
      return { icon: (props.artifact.viewType ?? 'bar') as 'bar', label: props.artifact.viewType ?? '视图' }
    case 'dashboard':
      return { icon: 'grid' as const, label: '看板' }
    case 'step':
      return { icon: 'flowchart' as const, label: '步骤' }
    default:
      return { icon: 'database' as const, label: '产物' }
  }
})

function open(): void {
  const a = props.artifact
  // 先关抽屉，避免遮住工作区；预览图 pointer-events:none，整卡可点
  ai.drawerOpen = false
  if (a.kind === 'dashboard' && a.dashboardId) {
    void router.push(`/dashboards/${a.dashboardId}`)
    return
  }
  if (!a.analysisId) return
  const query = a.tableId ? `?tableId=${a.tableId}${a.viewId ? `&viewId=${a.viewId}` : ''}` : ''
  void router.push(`/analysis/${a.analysisId}${query}`)
}
</script>

<template>
  <div class="art" data-testid="ai-artifact" role="link" tabindex="0" @click="open" @keydown.enter="open">
    <div class="art__head">
      <span class="art__icon"><IIcon :name="typeMeta.icon" :size="14" /></span>
      <span class="art__name is-ellipsis" :title="artifact.name">{{ artifact.name }}</span>
      <span class="art__badge">{{ typeMeta.label }}</span>
      <IIcon name="arrow-right" :size="12" class="art__go" />
    </div>
    <AiChartCard v-if="artifact.kind === 'view' && artifact.viewType !== 'table'" :artifact="artifact" class="art__chart" />
  </div>
</template>

<style scoped>
.art {
  margin: 8px 0 4px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--is-dur-fast) var(--is-ease);
}
.art:hover {
  border-color: var(--is-accent);
}
.art__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}
.art__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--is-radius-sm);
  background: var(--is-accent-soft);
  color: var(--is-accent);
  flex-shrink: 0;
}
.art__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
}
.art__badge {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--is-text-tertiary);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-full);
  padding: 1px 8px;
}
.art__go {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.art:hover .art__go {
  color: var(--is-accent);
}
.art__chart {
  border-top: 1px solid var(--is-border);
  /* Plotly 会吃掉点击；预览仅展示，交互交给外层产物卡 */
  pointer-events: none;
}
</style>
