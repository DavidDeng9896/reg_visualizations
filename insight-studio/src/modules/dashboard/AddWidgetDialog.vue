<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Analysis, ViewNode } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { normalizeExternalUrl } from '../../shared/factories'
import { IButton, IModal, ISelect, ITextField, type SelectOption } from '../../ui'

export type AddWidgetPayload =
  | {
      kind: 'insight'
      analysisId: string
      tableId: string
      viewId?: string
      type: 'chart' | 'table'
    }
  | {
      kind: 'link'
      url: string
      title?: string
    }

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm', payload: AddWidgetPayload): void
}>()

const mode = ref<'insight' | 'link'>('insight')
const analyses = ref<Analysis[]>([])
const loading = ref(false)
const analysisId = ref('')
const tableId = ref('')
const viewKey = ref('')
const linkUrl = ref('')
const linkTitle = ref('')
const linkError = ref('')

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
    mode.value = 'insight'
    linkUrl.value = ''
    linkTitle.value = ''
    linkError.value = ''
    loading.value = true
    try {
      analyses.value = await analysisRepository.list()
      analysisId.value = analyses.value[0]?.id ?? ''
      syncTable()
    } finally {
      loading.value = false
    }
  },
)

watch(analysisId, () => syncTable())
watch(tableId, () => {
  viewKey.value = selectedTable.value ? 'table' : ''
})

function syncTable() {
  const list = tables.value
  tableId.value = list[0]?.id ?? ''
  viewKey.value = tableId.value ? 'table' : ''
}

const canConfirm = computed(() => {
  if (mode.value === 'link') return !!normalizeExternalUrl(linkUrl.value)
  return !!analysisId.value && !!tableId.value && !!viewKey.value
})

function confirm() {
  if (!canConfirm.value) return
  if (mode.value === 'link') {
    const url = normalizeExternalUrl(linkUrl.value)
    if (!url) {
      linkError.value = '请输入有效的 http(s) 链接'
      return
    }
    emit('confirm', { kind: 'link', url, title: linkTitle.value.trim() || undefined })
    emit('update:open', false)
    return
  }
  let viewId: string | undefined
  let type: 'chart' | 'table' = 'table'
  if (viewKey.value.startsWith('view:')) {
    viewId = viewKey.value.slice(5)
    const t = selectedTable.value
    const v = t ? flattenViews(t.views).find((x) => x.id === viewId) : undefined
    type = v && v.type !== 'table' ? 'chart' : 'table'
  }
  emit('confirm', {
    kind: 'insight',
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
    <div class="awd__tabs" role="tablist">
      <button
        type="button"
        class="awd__tab"
        :class="{ 'awd__tab--on': mode === 'insight' }"
        role="tab"
        @click="mode = 'insight'"
      >
        Insight 表/图
      </button>
      <button
        type="button"
        class="awd__tab"
        :class="{ 'awd__tab--on': mode === 'link' }"
        role="tab"
        @click="mode = 'link'"
      >
        外部链接
      </button>
    </div>

    <div v-if="mode === 'link'" class="awd__form">
      <label class="awd__row">
        <span class="awd__label">链接 URL</span>
        <ITextField
          v-model="linkUrl"
          placeholder="https://example.com/report"
          autofocus
          @enter="confirm"
        />
        <span v-if="linkError" class="awd__err">{{ linkError }}</span>
      </label>
      <label class="awd__row">
        <span class="awd__label">标题（可选）</span>
        <ITextField v-model="linkTitle" placeholder="例如：实验 SOP / 外部报表" />
      </label>
      <p class="awd__hint">将在看板内嵌预览；若站点禁止嵌入，可点「新标签打开」查看。</p>
    </div>

    <template v-else>
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
    </template>

    <template #footer>
      <IButton @click="emit('update:open', false)">取消</IButton>
      <IButton variant="primary" :disabled="!canConfirm" @click="confirm">添加</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.awd__tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  padding: 3px;
  background: var(--is-surface-muted, #f2f4f7);
  border-radius: var(--is-radius-sm);
}
.awd__tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 7px 10px;
  font: inherit;
  font-size: var(--is-text-sm);
  border-radius: 4px;
  cursor: pointer;
  color: var(--is-text-secondary);
}
.awd__tab--on {
  background: var(--is-surface);
  color: var(--is-text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(16 24 40 / 6%);
}
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
.awd__err {
  font-size: 12px;
  color: var(--is-danger);
}
.awd__hint {
  margin: 0;
  font-size: 12px;
  color: var(--is-text-tertiary);
  line-height: 1.4;
}
.awd__loading,
.awd__empty {
  padding: 16px 0;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
}
</style>
