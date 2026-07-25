<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { ChartType } from '../../../shared/types'
import { IButton, ISelect, ITabs, IIcon, type SelectOption } from '../../../ui'
import { CHART_DEFS } from '../registry'
import { CHART_DRAFT_CONTEXT } from './context'

/**
 * 配置面板总装：图种名标题 + Chart type 设置项 + CONFIGURE/STYLE ITabs + 底部 Cancel/Save。
 * 编辑的是 ChartView 提供的本地草稿（CHART_DRAFT_CONTEXT）。
 * 视图重命名在侧栏 ⋯ 菜单；面板头部不再放名称输入与 Saved 状态。
 */
defineProps<{
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

const activeSection = computed(() => (tab.value === 'configure' ? def.value.configureSection : def.value.styleSection))
</script>

<template>
  <aside class="ccpanel" @keydown.esc.stop="emit('cancel')">
    <!-- 头部行：CONFIGURE/STYLE tabs（左）+ 无框 Chart type 下拉（右） -->
    <header class="ccpanel__head">
      <ITabs
        v-model="tab"
        :tabs="[
          { key: 'configure', label: 'CONFIGURE' },
          { key: 'style', label: 'STYLE' },
        ]"
        class="ccpanel__tabs"
      />
      <ISelect
        :model-value="def.type"
        :options="typeOptions"
        size="sm"
        variant="ghost"
        aria-label="Chart type"
        class="ccpanel__type"
        @update:model-value="onTypeChange"
      />
    </header>

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
  justify-content: space-between;
  gap: 8px;
  height: 44px;
  flex-shrink: 0;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--is-border);
}
.ccpanel__tabs {
  flex: 1;
  min-width: 0;
}
.ccpanel__tabs :deep(.is-tabs) {
  border-bottom: none;
}
.ccpanel__type {
  flex-shrink: 0;
}
.ccpanel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
}
/* 面板内输入/下拉统一 32px 高（对齐设计稿 is-field h-8） */
.ccpanel__body :deep(.is-field--sm),
.ccpanel__body :deep(.is-select--sm .is-select__trigger) {
  height: 32px;
}
.ccpanel__ft {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid var(--is-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ccpanel__ft-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
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
