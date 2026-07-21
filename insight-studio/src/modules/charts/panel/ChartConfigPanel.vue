<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { ChartType } from '../../../shared/types'
import { IButton, IIcon, ISelect, ITabs, ITextField, type SelectOption } from '../../../ui'
import { CHART_DEFS } from '../registry'
import { CHART_DRAFT_CONTEXT } from './context'

/**
 * 配置面板总装：视图名 + Chart type 下拉 + CONFIGURE/STYLE ITabs + 底部 Cancel/Save。
 * 编辑的是 ChartView 提供的本地草稿（CHART_DRAFT_CONTEXT）。
 */
const props = defineProps<{
  viewName: string
  /** 过滤/转换 chip 摘要（只读展示；编辑在表格视图）。 */
  chips: string[]
}>()
const emit = defineEmits<{ (e: 'rename', name: string): void; (e: 'cancel'): void; (e: 'save'): void }>()

const ctx = inject(CHART_DRAFT_CONTEXT)!
const def = computed(() => ctx.def.value)

const tab = ref<'configure' | 'style'>('configure')

const typeOptions = computed<SelectOption[]>(() => CHART_DEFS.map((d) => ({ value: d.type, label: d.label, icon: d.icon })))

function onTypeChange(v: string | number) {
  ctx.changeType(v as ChartType)
}

const nameInput = ref(props.viewName)
function submitRename() {
  const name = nameInput.value.trim()
  if (name && name !== props.viewName) emit('rename', name)
  else nameInput.value = props.viewName
}

const activeSection = computed(() => (tab.value === 'configure' ? def.value.configureSection : def.value.styleSection))
</script>

<template>
  <aside class="ccpanel" @keydown.esc.stop="emit('cancel')">
    <!-- 视图名 + 状态 -->
    <div class="ccpanel__head">
      <ITextField v-model="nameInput" size="sm" aria-label="视图名" class="ccpanel__name" @enter="submitRename" @blur="submitRename" />
      <span v-if="ctx.dirty.value" class="ccpanel__dirty" title="有未保存修改">
        <IIcon name="dot" :size="10" />
      </span>
      <span v-else class="ccpanel__saved">
        <IIcon name="check" :size="12" /> Saved
      </span>
    </div>

    <!-- Chart type -->
    <div class="ccpanel__type">
      <span class="ccpanel__label">Chart type</span>
      <ISelect :model-value="def.type" :options="typeOptions" size="sm" aria-label="Chart type" @update:model-value="onTypeChange" />
    </div>

    <!-- CONFIGURE / STYLE -->
    <ITabs
      v-model="tab"
      :tabs="[
        { key: 'configure', label: 'CONFIGURE' },
        { key: 'style', label: 'STYLE' },
      ]"
      class="ccpanel__tabs"
    />

    <div class="ccpanel__body">
      <KeepAlive>
        <component :is="activeSection" :key="`${def.type}-${tab}`" />
      </KeepAlive>

      <!-- FILTERS & TRANSFORMS（只读摘要；编辑入口在表格视图） -->
      <section class="ccpanel__ft">
        <h4 class="ccpanel__ft-title">FILTERS &amp; TRANSFORMS</h4>
        <p v-if="!chips.length" class="ccpanel__ft-empty">无（在表格视图中添加过滤与转换）</p>
        <ul v-else class="ccpanel__ft-list">
          <li v-for="(c, i) in chips" :key="i" class="ccpanel__ft-chip" :title="c">
            <IIcon name="filter" :size="11" />
            <span class="is-ellipsis">{{ c }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Cancel / Save -->
    <footer class="ccpanel__foot">
      <IButton @click="emit('cancel')">Cancel</IButton>
      <IButton variant="primary" :class="{ 'ccpanel__save--dirty': ctx.dirty.value }" @click="emit('save')">Save</IButton>
    </footer>
  </aside>
</template>

<style scoped>
.ccpanel {
  width: 340px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  overflow: hidden;
}
.ccpanel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 4px;
}
.ccpanel__name {
  flex: 1;
  min-width: 0;
}
.ccpanel__dirty {
  color: var(--is-accent);
  display: inline-flex;
}
.ccpanel__saved {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  white-space: nowrap;
}
.ccpanel__type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
}
.ccpanel__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.ccpanel__type :deep(.is-select) {
  flex: 1;
}
.ccpanel__tabs {
  padding: 0 14px;
}
.ccpanel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccpanel__ft {
  margin-top: 12px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.ccpanel__ft-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.ccpanel__ft-empty {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ccpanel__ft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccpanel__ft-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  padding: 4px 8px;
}
.ccpanel__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--is-border);
}
.ccpanel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}
</style>
