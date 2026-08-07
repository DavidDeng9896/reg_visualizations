<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IIcon } from '../../ui'
import type { TraceItem } from './aiStore'
import { briefOpLabel, fullArgs, fullSummary } from './traceLabels'

/**
 * 工具调用轨迹卡：
 * - 标题「已处理 N 个操作（完成 M）」；进行中标题/子项光影掠过
 * - 进行中保持折叠；待确认审批卡始终外露
 * - 子项一行显示精简操作内容；展开后完整参数与结果
 */
const props = withDefaults(
  defineProps<{
    items: TraceItem[]
    streaming?: boolean
    /** 为 true 时不在卡片内渲染审批区（由抽屉底部悬浮区展示）。 */
    hidePending?: boolean
  }>(),
  { hidePending: false },
)

defineEmits<{
  (e: 'confirm', t: TraceItem): void
  (e: 'reject', t: TraceItem): void
}>()

const expanded = ref(false)
/** 已展开明细的子项 id。 */
const openDetail = ref<Set<string>>(new Set())

const doneCount = computed(() => props.items.filter((t) => !t.running).length)
/** 任一子操作仍在执行 → 进行中（与整轮 streaming 解耦）。 */
const inProgress = computed(() => props.items.some((t) => t.running))

const pending = computed(() => {
  const seen = new Set<string>()
  return props.items.filter((t) => {
    if (!t.needsConfirmation || t.confirmed || t.rejected) return false
    if (seen.has(t.summary)) return false
    seen.add(t.summary)
    return true
  })
})

watch(inProgress, (busy) => {
  if (busy) expanded.value = false
})

function toggleDetail(id: string): void {
  const next = new Set(openDetail.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openDetail.value = next
}

function isDetailOpen(id: string): boolean {
  return openDetail.value.has(id)
}

function hasDetail(t: TraceItem): boolean {
  return !!(fullArgs(t) || fullSummary(t))
}

function pendingAction(t: TraceItem): string {
  return fullSummary(t)
}

const headLabel = computed(() => `已处理 ${props.items.length} 个操作（完成 ${doneCount.value}）`)
</script>

<template>
  <div class="trace" data-testid="ai-trace" :data-in-progress="inProgress || undefined">
    <button
      type="button"
      class="trace__head"
      :aria-expanded="expanded"
      data-testid="ai-trace-head"
      @click="expanded = !expanded"
    >
      <IIcon name="chevron-right" :size="12" class="trace__chev" :class="{ 'trace__chev--open': expanded }" />
      <span class="trace__head-text" :class="{ 'trace__shimmer': inProgress }">{{ headLabel }}</span>
    </button>

    <div v-if="expanded" class="trace__list" data-testid="ai-trace-list">
      <div
        v-for="t in items"
        :key="t.id"
        class="trace__item"
        :class="{
          'trace__item--fail': t.ok === false && (!t.needsConfirmation || !!t.rejected),
          'trace__item--open': isDetailOpen(t.id),
        }"
      >
        <button
          type="button"
          class="trace__row"
          :disabled="!hasDetail(t)"
          :aria-expanded="isDetailOpen(t.id)"
          :data-testid="`ai-trace-item-${t.id}`"
          @click="hasDetail(t) && toggleDetail(t.id)"
        >
          <span class="trace__status">
            <IIcon v-if="t.running" name="spinner" :size="11" class="trace__spin" />
            <IIcon
              v-else-if="t.needsConfirmation && !t.confirmed && !t.rejected"
              name="warning"
              :size="11"
              class="trace__warn"
            />
            <IIcon v-else-if="t.ok" name="check" :size="11" class="trace__ok" />
            <IIcon v-else name="close" :size="11" class="trace__fail" />
          </span>
          <span class="trace__label" :class="{ 'trace__shimmer': t.running }">{{ briefOpLabel(t) }}</span>
          <IIcon
            v-if="hasDetail(t)"
            name="chevron-right"
            :size="11"
            class="trace__item-chev"
            :class="{ 'trace__item-chev--open': isDetailOpen(t.id) }"
          />
        </button>
        <div v-if="isDetailOpen(t.id)" class="trace__detail">
          <div class="trace__tool">工具：{{ t.name }}</div>
          <pre v-if="fullArgs(t)" class="trace__args">{{ fullArgs(t) }}</pre>
          <div v-if="fullSummary(t)" class="trace__summary">{{ fullSummary(t) }}</div>
        </div>
      </div>
    </div>

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
.trace__head-text {
  min-width: 0;
}
.trace__chev {
  transition: transform var(--is-dur-fast) var(--is-ease);
  flex-shrink: 0;
}
.trace__chev--open {
  transform: rotate(90deg);
}

/*
 * 光影掠过：窄而亮的高光带 + linear 匀速；
 * 背景拉大、行程拉长，避免两端停顿感，对比更明显。
 */
.trace__shimmer {
  display: inline-block;
  color: transparent;
  background-image: linear-gradient(
    105deg,
    color-mix(in srgb, var(--is-text-tertiary) 55%, transparent) 0%,
    color-mix(in srgb, var(--is-text-tertiary) 55%, transparent) 38%,
    color-mix(in srgb, var(--is-text) 55%, #fff) 46%,
    #fff 50%,
    color-mix(in srgb, var(--is-text) 55%, #fff) 54%,
    color-mix(in srgb, var(--is-text-tertiary) 55%, transparent) 62%,
    color-mix(in srgb, var(--is-text-tertiary) 55%, transparent) 100%
  );
  background-size: 320% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: tr-shimmer 1.55s linear infinite;
  will-change: background-position;
}
.trace__label.trace__shimmer {
  background-image: linear-gradient(
    105deg,
    var(--is-text) 0%,
    var(--is-text) 36%,
    color-mix(in srgb, var(--is-accent) 45%, #fff) 45%,
    #fff 50%,
    color-mix(in srgb, var(--is-accent) 45%, #fff) 55%,
    var(--is-text) 64%,
    var(--is-text) 100%
  );
  background-size: 320% 100%;
}
@keyframes tr-shimmer {
  0% {
    background-position: 140% 50%;
  }
  100% {
    background-position: -140% 50%;
  }
}

.trace__spin {
  animation: tr-spin 0.85s linear infinite;
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
  padding: 6px 0 4px 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
}
.trace__item {
  font-size: var(--is-text-xs);
  border-radius: var(--is-radius-sm);
}
.trace__row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 4px 5px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: var(--is-radius-sm);
}
.trace__row:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.trace__row:disabled {
  cursor: default;
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
.trace__label {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  color: var(--is-text);
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trace__item-chev {
  flex-shrink: 0;
  color: var(--is-text-tertiary);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.trace__item-chev--open {
  transform: rotate(90deg);
}
.trace__detail {
  padding: 2px 4px 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.trace__tool {
  font-size: 10px;
  color: var(--is-text-tertiary);
  font-family: var(--is-font-mono);
}
.trace__args {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  font-family: var(--is-font-mono);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: none;
  overflow: visible;
}
.trace__summary {
  color: var(--is-text);
  font-size: var(--is-text-xs);
  line-height: 1.55;
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
