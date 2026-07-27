<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardWidget } from '../../shared/types'
import { IButton, IIcon } from '../../ui'
import { resolveWidgetSource, type WidgetResolveResult } from './widgetData'
import ChartWidget from './ChartWidget.vue'
import TableWidget from './TableWidget.vue'

const props = defineProps<{
  widget: DashboardWidget
  editLayout?: boolean
}>()

const emit = defineEmits<{
  (e: 'remove'): void
}>()

const router = useRouter()
const rootEl = ref<HTMLElement | null>(null)
const inView = ref(false)
const loading = ref(false)
const resolved = ref<WidgetResolveResult | null>(null)
let io: IntersectionObserver | null = null
let gen = 0

const title = computed(() => {
  if (props.widget.title) return props.widget.title
  if (resolved.value?.ok) return resolved.value.title
  return props.widget.type === 'chart' ? '图表' : '表格'
})

const sourceLabel = computed(() => {
  if (!resolved.value?.ok) return ''
  return `来自 Insight · ${resolved.value.analysis.name}`
})

async function load() {
  if (!inView.value) return
  const token = ++gen
  loading.value = true
  const r = await resolveWidgetSource(props.widget.ref)
  if (token !== gen) return
  resolved.value = r
  loading.value = false
}

watch(
  () => [props.widget.ref.analysisId, props.widget.ref.tableId, props.widget.ref.viewId] as const,
  () => {
    resolved.value = null
    void load()
  },
)

watch(inView, (v) => {
  if (v) void load()
})

onMounted(() => {
  const el = rootEl.value
  if (!el || typeof IntersectionObserver === 'undefined') {
    inView.value = true
    return
  }
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          inView.value = true
          io?.unobserve(e.target)
        }
      }
    },
    { root: null, rootMargin: '80px', threshold: 0.01 },
  )
  io.observe(el)
})

onBeforeUnmount(() => {
  gen++
  io?.disconnect()
})

function openSource() {
  const { analysisId, tableId, viewId } = props.widget.ref
  const q = new URLSearchParams({ tableId })
  if (viewId) q.set('viewId', viewId)
  void router.push(`/analysis/${analysisId}?${q.toString()}`)
}
</script>

<template>
  <article ref="rootEl" class="dwc">
    <header class="dwc__head">
      <div class="dwc__titles">
        <h3 class="dwc__title is-ellipsis" :title="title">{{ title }}</h3>
        <p v-if="sourceLabel" class="dwc__src is-ellipsis">{{ sourceLabel }}</p>
      </div>
      <div class="dwc__actions">
        <IButton variant="ghost" size="sm" icon="external" title="打开源视图" @click.stop="openSource" />
        <IButton variant="ghost" size="sm" icon="trash" title="移除" @click.stop="emit('remove')" />
      </div>
    </header>
    <div class="dwc__body">
      <div v-if="!inView || loading" class="dwc__skel" aria-hidden="true" />
      <div v-else-if="resolved && !resolved.ok" class="dwc__broken">
        <IIcon name="warning" :size="18" />
        <span>{{ resolved.message }}</span>
      </div>
      <ChartWidget
        v-else-if="resolved?.ok && widget.type === 'chart'"
        :source="resolved"
      />
      <TableWidget
        v-else-if="resolved?.ok"
        :source="resolved"
      />
    </div>
  </article>
</template>

<style scoped>
.dwc {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-md, 8px);
  overflow: hidden;
}
.dwc__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px 6px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.dwc__titles {
  min-width: 0;
}
.dwc__title {
  margin: 0;
  font-size: var(--is-text-sm, 13px);
  font-weight: 600;
}
.dwc__src {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.dwc__actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.dwc__body {
  flex: 1;
  min-height: 0;
  position: relative;
}
.dwc__skel {
  position: absolute;
  inset: 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--is-surface-hover) 25%, var(--is-border) 50%, var(--is-surface-hover) 75%);
  background-size: 200% 100%;
  animation: dwc-shimmer 1.2s ease-in-out infinite;
}
@keyframes dwc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.dwc__broken {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  padding: 16px;
  color: var(--is-warning-text, #92400e);
  font-size: var(--is-text-sm);
  text-align: center;
}
</style>
