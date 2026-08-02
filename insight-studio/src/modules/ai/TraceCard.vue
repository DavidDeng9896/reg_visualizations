<script setup lang="ts">
import { computed, ref } from 'vue'
import { IIcon } from '../../ui'
import type { TraceItem } from './aiStore'

/** 工具调用轨迹卡：「已处理 N 个操作」默认折叠，展开看每步详情。 */
const props = defineProps<{
  items: TraceItem[]
  streaming?: boolean
}>()

const expanded = ref(false)
const doneCount = computed(() => props.items.filter((t) => !t.running).length)

function briefArgs(t: TraceItem): string {
  if (!t.args) return ''
  const s = JSON.stringify(t.args)
  return s.length > 90 ? `${s.slice(0, 90)}…` : s
}
</script>

<template>
  <div class="trace" data-testid="ai-trace">
    <button type="button" class="trace__head" :aria-expanded="expanded" @click="expanded = !expanded">
      <IIcon name="chevron-right" :size="12" class="trace__chev" :class="{ 'trace__chev--open': expanded }" />
      <span>已处理 {{ items.length }} 个操作（完成 {{ doneCount }}）</span>
      <IIcon v-if="streaming" name="spinner" :size="12" class="trace__spin" />
    </button>
    <div v-if="expanded" class="trace__list">
      <div v-for="t in items" :key="t.id" class="trace__item" :class="{ 'trace__item--fail': t.ok === false && !t.needsConfirmation }">
        <div class="trace__row">
          <span class="trace__status">
            <IIcon v-if="t.running" name="spinner" :size="11" class="trace__spin" />
            <IIcon v-else-if="t.needsConfirmation && !t.confirmed" name="warning" :size="11" class="trace__warn" />
            <IIcon v-else-if="t.ok" name="check" :size="11" class="trace__ok" />
            <IIcon v-else name="close" :size="11" class="trace__fail" />
          </span>
          <span class="trace__name">{{ t.name }}</span>
        </div>
        <div v-if="briefArgs(t)" class="trace__args">{{ briefArgs(t) }}</div>
        <div v-if="t.summary" class="trace__summary">{{ t.summary.replace(/^NEEDS_CONFIRMATION:\s*/, '') }}</div>
        <button
          v-if="t.needsConfirmation && !t.confirmed"
          type="button"
          class="trace__confirm"
          data-testid="ai-trace-confirm"
          @click="$emit('confirm', t)"
        >
          确认执行
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  emits: ['confirm'],
}
</script>

<style scoped>
.trace {
  margin: 8px 0 4px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  overflow: hidden;
}
.trace__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  cursor: pointer;
  text-align: left;
}
.trace__head:hover {
  background: var(--is-surface-hover);
}
.trace__chev {
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.trace__chev--open {
  transform: rotate(90deg);
}
.trace__spin {
  margin-left: auto;
  animation: tr-spin 1s linear infinite;
  color: var(--is-accent);
}
@keyframes tr-spin {
  to {
    transform: rotate(360deg);
  }
}
.trace__list {
  border-top: 1px solid var(--is-border);
  padding: 6px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.trace__item {
  font-size: var(--is-text-xs);
}
.trace__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.trace__status {
  display: inline-flex;
  width: 14px;
  justify-content: center;
  flex-shrink: 0;
}
.trace__ok {
  color: var(--is-success);
}
.trace__fail {
  color: var(--is-danger);
}
.trace__warn {
  color: var(--is-warning-text);
}
.trace__name {
  font-weight: 500;
  color: var(--is-text);
  font-family: var(--is-font-mono);
  font-size: 11px;
}
.trace__args {
  margin: 2px 0 0 20px;
  color: var(--is-text-tertiary);
  font-family: var(--is-font-mono);
  font-size: 11px;
  word-break: break-all;
}
.trace__summary {
  margin: 2px 0 0 20px;
  color: var(--is-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}
.trace__confirm {
  margin: 6px 0 0 20px;
  padding: 3px 12px;
  border: 1px solid var(--is-accent);
  border-radius: var(--is-radius-sm);
  background: var(--is-accent);
  color: #fff;
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.trace__confirm:hover {
  background: var(--is-accent-hover);
}
</style>
