<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IIcon } from '../../ui'
import type { TraceItem } from './aiStore'

/** 工具调用轨迹卡：「已处理 N 个操作」默认折叠，展开看每步详情；待确认可外露或由上层悬浮区接管。 */
const props = withDefaults(
  defineProps<{
    items: TraceItem[]
    streaming?: boolean
    /** 为 true 时不在卡片内渲染审批区（由抽屉底部悬浮区展示）。 */
    hidePending?: boolean
  }>(),
  { hidePending: false },
)
const expanded = ref(false)
const doneCount = computed(() => props.items.filter((t) => !t.running).length)
const pending = computed(() => {
  const seen = new Set<string>()
  return props.items.filter((t) => {
    if (!t.needsConfirmation || t.confirmed || t.rejected) return false
    // 模型偶尔重复发起同一删除，去重避免确认按钮堆叠
    if (seen.has(t.summary)) return false
    seen.add(t.summary)
    return true
  })
})
watch(
  pending,
  (p) => {
    // 有待确认操作时自动展开，让上下文可见
    if (p.length) expanded.value = true
  },
  { immediate: true },
)

function briefArgs(t: TraceItem): string {
  if (!t.args) return ''
  const s = JSON.stringify(t.args)
  return s.length > 90 ? `${s.slice(0, 90)}…` : s
}

/** 审批卡展示的具体操作描述（去协议前缀与续轮提示后缀）。 */
function pendingAction(t: TraceItem): string {
  return (t.summary || '')
    .replace(/^NEEDS_CONFIRMATION:\s*/, '')
    .split('。不要重试')[0]
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
      <div
        v-for="t in items"
        :key="t.id"
        class="trace__item"
        :class="{ 'trace__item--fail': t.ok === false && (!t.needsConfirmation || !!t.rejected) }"
      >
        <div class="trace__row">
          <span class="trace__status">
            <IIcon v-if="t.running" name="spinner" :size="11" class="trace__spin" />
            <IIcon v-else-if="t.needsConfirmation && !t.confirmed && !t.rejected" name="warning" :size="11" class="trace__warn" />
            <IIcon v-else-if="t.ok" name="check" :size="11" class="trace__ok" />
            <IIcon v-else name="close" :size="11" class="trace__fail" />
          </span>
          <span class="trace__name">{{ t.name }}</span>
        </div>
        <div v-if="briefArgs(t)" class="trace__args">{{ briefArgs(t) }}</div>
        <div v-if="t.summary" class="trace__summary">{{ t.needsConfirmation ? pendingAction(t) : t.summary }}</div>
      </div>
    </div>
    <!-- 待确认操作：折叠状态下也始终外露的审批卡（可被 hidePending 关掉） -->
    <template v-if="!hidePending">
      <div v-for="t in pending" :key="`cf-${t.id}`" class="trace__pending">
        <div class="trace__pending-head">
          <IIcon name="approval" :size="13" class="trace__warn" />
          <span class="trace__pending-title">需要你的批准</span>
          <code class="trace__pending-tag">{{ t.name }}</code>
        </div>
        <div class="trace__pending-body">{{ pendingAction(t) }}</div>
        <div class="trace__pending-actions">
          <button type="button" class="trace__reject" @click="$emit('reject', t)">
            <IIcon name="close" :size="12" />
            拒绝
          </button>
          <button type="button" class="trace__approve" data-testid="ai-trace-confirm" @click="$emit('confirm', t)">
            <IIcon name="check" :size="12" />
            批准并执行
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
export default {
  emits: ['confirm', 'reject'],
}
</script>

<style scoped>
.trace {
  margin: 4px 0;
}
.trace__head {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 3px 0;
  border: none;
  background: transparent;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  cursor: pointer;
  text-align: left;
}
.trace__head:hover {
  color: var(--is-text-secondary);
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
  border-top: 1px dashed var(--is-border);
  margin-top: 4px;
  padding: 8px 0 4px 2px;
  display: flex;
  flex-direction: column;
  gap: 9px;
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
.trace__pending {
  margin-top: 8px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  box-shadow: var(--is-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.05));
  overflow: hidden;
}
.trace__pending-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
}
.trace__pending-title {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text);
}
.trace__pending-tag {
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid color-mix(in srgb, var(--is-danger) 45%, transparent);
  border-radius: var(--is-radius-sm);
  color: var(--is-danger);
  font-family: var(--is-font-mono);
  font-size: 10px;
}
.trace__pending-body {
  padding: 7px 10px;
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  font-size: var(--is-text-xs);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.trace__pending-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 10px;
}
.trace__approve {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: 1px solid var(--is-accent);
  border-radius: var(--is-radius-sm);
  background: var(--is-accent);
  color: #fff;
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.trace__approve:hover {
  background: var(--is-accent-hover);
}
.trace__reject {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.trace__reject:hover {
  background: var(--is-surface-hover);
  color: var(--is-danger);
}
</style>
