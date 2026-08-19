<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Analysis, ViewType } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { normalizeExternalUrl } from '../../shared/factories'
import { IButton, IModal, ISelect, ITextField, type SelectOption } from '../../ui'
import SourceTreePicker, { type TreePick } from './SourceTreePicker.vue'

export type AddWidgetPayload =
  | {
      kind: 'insight'
      analysisId: string
      tableId: string
      viewId?: string
      type: 'chart' | 'table'
    }
  | {
      kind: 'python-chart'
      analysisId: string
      chartId: string
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
const pick = ref<TreePick | null>(null)
const linkUrl = ref('')
const linkTitle = ref('')
const linkError = ref('')

const selectedAnalysis = computed(() => analyses.value.find((a) => a.id === analysisId.value) ?? null)

const analysisOptions = computed<SelectOption[]>(() =>
  analyses.value.map((a) => ({ value: a.id, label: a.name })),
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    mode.value = 'insight'
    linkUrl.value = ''
    linkTitle.value = ''
    linkError.value = ''
    pick.value = null
    loading.value = true
    try {
      analyses.value = await analysisRepository.list()
      analysisId.value = analyses.value[0]?.id ?? ''
    } finally {
      loading.value = false
    }
  },
)

watch(analysisId, () => {
  pick.value = null
})

const canConfirm = computed(() => {
  if (mode.value === 'link') return !!normalizeExternalUrl(linkUrl.value)
  return !!analysisId.value && !!pick.value
})

function chartTypeOf(viewType: ViewType): 'chart' | 'table' {
  return viewType === 'table' ? 'table' : 'chart'
}

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
  const p = pick.value
  if (!p) return
  if (p.kind === 'table') {
    emit('confirm', {
      kind: 'insight',
      analysisId: analysisId.value,
      tableId: p.tableId,
      type: 'table',
    })
  } else if (p.kind === 'python-chart') {
    emit('confirm', {
      kind: 'python-chart',
      analysisId: analysisId.value,
      chartId: p.chartId,
    })
  } else {
    emit('confirm', {
      kind: 'insight',
      analysisId: analysisId.value,
      tableId: p.tableId,
      viewId: p.viewId,
      type: chartTypeOf(p.viewType),
    })
  }
  emit('update:open', false)
}

function onClose(v: boolean) {
  emit('update:open', v)
}
</script>

<template>
  <IModal :open="open" title="添加组件" :width="520" @update:open="onClose">
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
        <div class="awd__row">
          <span class="awd__label">选择表或图表</span>
          <SourceTreePicker v-model="pick" :analysis="selectedAnalysis" />
          <p class="awd__hint">与左侧侧栏相同：图标区分表/图，缩进表示父子关系。</p>
        </div>
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
