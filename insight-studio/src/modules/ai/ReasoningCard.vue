<script setup lang="ts">
import { ref, watch } from 'vue'
import { IIcon } from '../../ui'

/** 思考过程卡：推理模型的 reasoning 流，流式时展开、结束后可折叠回看。 */
const props = defineProps<{
  reasoning: string
  streaming?: boolean
}>()

const open = ref(!!props.streaming)
watch(
  () => props.streaming,
  (s) => {
    // 流式时展开看思考，结束后自动折叠（可手动再展开）
    open.value = !!s
  },
)
</script>

<template>
  <div class="reason" data-testid="ai-reasoning">
    <button type="button" class="reason__head" :aria-expanded="open" @click="open = !open">
      <IIcon name="chevron-right" :size="12" class="reason__chev" :class="{ 'reason__chev--open': open }" />
      <span>思考过程</span>
      <IIcon v-if="streaming" name="spinner" :size="12" class="reason__spin" />
    </button>
    <div v-if="open" class="reason__body">{{ reasoning }}</div>
  </div>
</template>

<style scoped>
.reason {
  margin: 2px 0 6px;
}
.reason__head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 2px 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  cursor: pointer;
}
.reason__head:hover {
  color: var(--is-text-secondary);
}
.reason__chev {
  transition: transform var(--is-dur) var(--is-ease);
}
.reason__chev--open {
  transform: rotate(90deg);
}
.reason__spin {
  animation: reason-spin 1s linear infinite;
}
.reason__body {
  margin: 4px 0 2px;
  padding: 8px 10px;
  border-left: 2px solid var(--is-border);
  font-size: var(--is-text-xs);
  line-height: 1.7;
  color: var(--is-text-tertiary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
}
@keyframes reason-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
