<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Analysis, ViewNode } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { IButton, IModal, ISelect, type SelectOption } from '../../ui'

export type AddWidgetPayload = {
  analysisId: string
  tableId: string
  viewId?: string
  type: 'chart' | 'table'
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm', payload: AddWidgetPayload): void
}>()

const analyses = ref<Analysis[]>([])
const loading = ref(false)
const analysisId = ref('')
const tableId = ref('')
const viewKey = ref('') // '' | `view:${id}` | `table`

const selectedAnalysis = computed(() => analyses.value.find((a) => a.id === analysisId.value))
const tables = computed(() => selectedAnalysis.value?.tables ?? [])
const selectedTable = computed(() => tables.value.find((t) => t.id === tableId.value))

const analysisOptions = computed<SelectOption[]>(() =>
  analyses.value.map((a) => ({ value: a.id, label: a.name })),
)
const tableOptions = computed<SelectOption[]>(() =>
  tables.value.map((t) => ({ value: t.id, label: t.name })),
)

function flattenViews(views: ViewNode[], depth = 0): { id: string; name: string; type: ViewNode['type'] }[] {
  const out: { id: string; name: string; type: ViewNode['type'] }[] = []
  for (const v of views) {
    out.push({ id: v.id, name: `${'—'.repeat(depth)}${depth ? ' ' : ''}${v.name}`, type: v.type })
    out.push(...flattenViews(v.children, depth + 1))
  }
  return out
}

const viewOptions = computed<SelectOption[]>(() => {
  const t = selectedTable.value
  if (!t) return []
  const opts: SelectOption[] = [{ value: 'table', label: `源表「${t.name}」（只读）` }]
  for (const v of flattenViews(t.views)) {
    const kind = v.type === 'table' ? '表视图' : '图表'
    opts.push({ value: `view:${v.id}`, label: `${v.name} · ${kind}` })
  }
  return opts
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    loading.value = true
    try {
      analyses.value = await analysisRepository.list()
      analysisId.value = analyses.value[0]?.id ?? ''
      tableId.value = ''
      viewKey.value = ''
      syncTable()
    } finally {
      loading.value = false
    }
  },
)

watch(analysisId, () => {
  syncTable()
})

watch(tableId, () => {
  viewKey.value = selectedTable.value ? 'table' : ''
})

function syncTable() {
  const list = tables.value
  tableId.value = list[0]?.id ?? ''
  viewKey.value = tableId.value ? 'table' : ''
}

const canConfirm = computed(() => !!analysisId.value && !!tableId.value && !!viewKey.value)

function confirm() {
  if (!canConfirm.value) return
  let viewId: string | undefined
  let type: 'chart' | 'table' = 'table'
  if (viewKey.value.startsWith('view:')) {
    viewId = viewKey.value.slice(5)
    const t = selectedTable.value
    const v = t ? flattenViews(t.views).find((x) => x.id === viewId) : undefined
    type = v && v.type !== 'table' ? 'chart' : 'table'
  }
  emit('confirm', {
    analysisId: analysisId.value,
    tableId: tableId.value,
    viewId,
    type,
  })
  emit('update:open', false)
}

function onClose(v: boolean) {
  emit('update:open', v)
}
</script>

<template>
  <IModal :open="open" title="添加组件" :width="480" @update:open="onClose">
    <div v-if="loading" class="awd__loading">加载 Insight 列表…</div>
    <div v-else-if="!analyses.length" class="awd__empty">
      还没有 Insight。请先到 Insight 中创建分析并配置表/图。
    </div>
    <div v-else class="awd__form">
      <label class="awd__row">
        <span class="awd__label">Insight</span>
        <ISelect v-model="analysisId" :options="analysisOptions" placeholder="选择 Insight" />
      </label>
      <label class="awd__row">
        <span class="awd__label">表</span>
        <ISelect v-model="tableId" :options="tableOptions" placeholder="选择表" :disabled="!tableOptions.length" />
      </label>
      <label class="awd__row">
        <span class="awd__label">视图</span>
        <ISelect v-model="viewKey" :options="viewOptions" placeholder="选择视图或源表" :disabled="!viewOptions.length" />
      </label>
    </div>
    <template #footer>
      <IButton @click="emit('update:open', false)">取消</IButton>
      <IButton variant="primary" :disabled="!canConfirm" @click="confirm">添加</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.awd__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.awd__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.awd__label {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text-secondary);
}
.awd__loading,
.awd__empty {
  padding: 16px 0;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
}
</style>
