<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { IIcon } from '../../ui'
import AskCard from './AskCard.vue'
import { useAiStore, type TraceItem } from './aiStore'

/** 需用户决定的卡片：钉在会话滚动区外、输入框上方，避免滚走遗漏。 */
const emit = defineEmits<{
  (e: 'confirm', item: TraceItem): void
  (e: 'reject', item: TraceItem): void
}>()

const ai = useAiStore()
const { messages, pendingAsk } = storeToRefs(ai)

const pendingConfirms = computed(() => {
  const seen = new Set<string>()
  const out: TraceItem[] = []
  for (const m of messages.value) {
    if (m.role !== 'assistant') continue
    for (const t of m.trace ?? []) {
      if (!t.needsConfirmation || t.confirmed || t.rejected) continue
      if (seen.has(t.summary)) continue
      seen.add(t.summary)
      out.push(t)
    }
  }
  return out
})

const pendingAskItem = computed(() => {
  const id = pendingAsk.value?.id
  if (!id) return null
  for (const m of messages.value) {
    const hit = m.trace?.find((t) => t.id === id && t.ask)
    if (hit) return hit
  }
  return null
})

const visible = computed(() => pendingConfirms.value.length > 0 || !!pendingAskItem.value)

function pendingAction(t: TraceItem): string {
  return (t.summary || '')
    .replace(/^NEEDS_CONFIRMATION:\s*/, '')
    .split('。不要重试')[0]
    .split('。界面已出现')[0]
}
</script>

<template>
  <div v-if="visible" class="pad" data-testid="ai-pending-actions">
    <div v-for="t in pendingConfirms" :key="`cf-${t.id}`" class="pad__card">
      <div class="pad__head">
        <IIcon name="approval" :size="13" class="pad__warn" />
        <span class="pad__title">需要你的批准</span>
        <code class="pad__tag">{{ t.name }}</code>
      </div>
      <div class="pad__body">{{ pendingAction(t) }}</div>
      <div class="pad__actions">
        <button type="button" class="pad__reject" @click="emit('reject', t)">
          <IIcon name="close" :size="12" />
          拒绝
        </button>
        <button type="button" class="pad__approve" data-testid="ai-trace-confirm" @click="emit('confirm', t)">
          <IIcon name="check" :size="12" />
          批准并执行
        </button>
      </div>
    </div>
    <AskCard v-if="pendingAskItem" :item="pendingAskItem" />
  </div>
</template>

<style scoped>
.pad {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--is-border);
  background: color-mix(in srgb, var(--is-accent-soft, #eaf2fc) 55%, var(--is-bg));
  box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.06);
  z-index: 2;
}
.pad__card {
  border: 1px solid color-mix(in srgb, var(--is-accent, #3584e4) 35%, var(--is-border));
  border-radius: var(--is-radius-sm);
  background: var(--is-surface);
  padding: 10px 12px;
}
.pad__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.pad__warn {
  color: var(--is-warning, #b54708);
}
.pad__title {
  font-size: var(--is-text-xs);
  font-weight: 600;
}
.pad__tag {
  margin-left: auto;
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.pad__body {
  font-size: var(--is-text-sm);
  line-height: 1.5;
  color: var(--is-text);
  margin-bottom: 10px;
}
.pad__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.pad__reject,
.pad__approve {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--is-radius-sm);
  padding: 5px 10px;
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.pad__reject {
  border: 1px solid var(--is-border);
  background: var(--is-surface);
  color: var(--is-text-secondary);
}
.pad__approve {
  border: none;
  background: var(--is-accent, #3584e4);
  color: #fff;
}
</style>
