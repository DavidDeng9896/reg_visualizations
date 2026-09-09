<script setup lang="ts">
import { computed, ref } from 'vue'
import { IIcon } from '../../ui'
import { REASONING_DISPLAY_CAP } from './contentScrub'

/**
 * 思考过程卡：推理模型的 reasoning 流。
 * UX P0：默认折叠（含流式中），仅一行中文摘要；用户可手动展开；不删内容。
 * 勿改 contentScrub / think-tag 剥离逻辑。
 */
const props = defineProps<{
  reasoning: string
  streaming?: boolean
  /** 已知图种时用于摘要，如 scatter → 正在创建散点图… */
  chartHint?: string | null
}>()

/** 默认折叠；不因 streaming 自动展开。 */
const open = ref(false)

const CHART_HINT_LABEL: Record<string, string> = {
  scatter: '散点图',
  bar: '柱状图',
  line: '折线图',
  box: '箱线图',
  pie: '饼图',
  heatmap: '热力图',
  bignumber: '指标卡',
}

const collapsedSummary = computed(() => {
  const hint = (props.chartHint ?? '').trim().toLowerCase()
  const label = hint ? CHART_HINT_LABEL[hint] : undefined
  if (label) return `正在创建${label}…`
  return '正在根据当前表生成图表…'
})

const headLabel = computed(() => {
  if (open.value) return '思考过程'
  if (props.streaming) return collapsedSummary.value
  return '思考过程'
})

const displayText = computed(() => {
  const t = props.reasoning
  if (t.length <= REASONING_DISPLAY_CAP) return t
  return `…(已截断冗长思考)…\n${t.slice(-REASONING_DISPLAY_CAP)}`
})
</script>

<template>
  <div class="reason" data-testid="ai-reasoning">
    <button type="button" class="reason__head" :aria-expanded="open" @click="open = !open">
      <IIcon name="chevron-right" :size="12" class="reason__chev" :class="{ 'reason__chev--open': open }" />
      <span class="reason__head-text" :class="{ 'reason__shimmer': streaming && !open }">{{ headLabel }}</span>
      <IIcon v-if="streaming" name="spinner" :size="12" class="reason__spin" />
    </button>
    <div v-if="open" class="reason__body">{{ displayText }}</div>
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
.reason__head-text {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.reason__shimmer {
  background: linear-gradient(
    90deg,
    var(--is-text-tertiary) 0%,
    var(--is-text-secondary) 40%,
    var(--is-text-tertiary) 80%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: reason-shimmer 1.6s ease-in-out infinite;
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
  max-height: 10.5em;
  overflow-y: auto;
}
@keyframes reason-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes reason-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
