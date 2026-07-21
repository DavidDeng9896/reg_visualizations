<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { IIcon } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { viewTypeLabel } from './graph'

/**
 * 流程图自定义节点（对齐 Benchling flow-frame 截图）：
 * 浅绿底圆角卡 + 左侧类型图标 + 名称/摘要 + 右侧绿色对勾圆点；
 * combine 步骤为更小的紧凑卡。
 */
const props = defineProps<{
  id: string
  data: FlowNodeData
  selected?: boolean
}>()

const emit = defineEmits<{ (e: 'open', id: string): void }>()

const isCombineStep = computed(() => props.data.kind === 'combine-step')

const icon = computed<IconName>(() => {
  const d = props.data
  if (d.kind === 'table') return d.source === 'combine' ? 'combine' : 'database'
  if (d.kind === 'combine-step') return 'combine'
  return (d.viewType ?? 'table') as IconName
})

const subLabel = computed(() => {
  const d = props.data
  if (d.kind === 'table') {
    const parts = [`${d.rowCount ?? 0} 行`]
    if (d.viewCount) parts.push(`${d.viewCount} 视图`)
    return parts.join(' · ')
  }
  if (d.kind === 'view') return viewTypeLabel(d.viewType ?? 'table')
  return d.contextLabel ? `→ ${d.contextLabel}` : ''
})
</script>

<template>
  <div
    class="flow-node"
    :class="[`flow-node--${data.kind}`, { 'flow-node--invalid': !data.valid }]"
    :data-node-kind="data.kind"
  >
    <Handle type="target" :position="Position.Left" class="flow-node__handle" />
    <span class="flow-node__icon" aria-hidden="true">
      <IIcon :name="icon" :size="isCombineStep ? 13 : 15" />
    </span>
    <span class="flow-node__body">
      <span class="flow-node__label is-ellipsis" :title="data.label">{{ data.label }}</span>
      <span v-if="subLabel" class="flow-node__sub is-ellipsis">{{ subLabel }}</span>
    </span>
    <span
      class="flow-node__status"
      :class="{ 'flow-node__status--warn': !data.valid }"
      :title="data.valid ? '有效' : 'combine 输入缺失'"
    >
      <IIcon :name="data.valid ? 'check' : 'warning'" :size="10" />
    </span>
    <button
      type="button"
      class="flow-node__open"
      title="在工作区打开"
      aria-label="在工作区打开"
      @click.stop="emit('open', id)"
      @dblclick.stop
    >
      <IIcon name="external" :size="11" />
    </button>
    <Handle type="source" :position="Position.Right" class="flow-node__handle" />
  </div>
</template>

<style scoped>
.flow-node {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 200px;
  min-height: 52px;
  padding: 8px 10px;
  background: var(--is-node-bg);
  border: 1px solid #cdebdc;
  border-radius: var(--is-radius);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  cursor: grab;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
}
.flow-node:active {
  cursor: grabbing;
}
.flow-node:hover {
  transform: translateY(-1px);
  box-shadow: var(--is-shadow-md);
}
/* 选中态：画布通过 node.class 驱动 is-active / is-linked */
:global(.vue-flow__node.is-active) .flow-node {
  border-color: var(--is-success);
  box-shadow:
    0 0 0 2px rgba(31, 157, 102, 0.25),
    var(--is-shadow-md);
}
:global(.vue-flow__node.is-linked) .flow-node {
  border-color: #7ccba4;
}

/* combine 步骤：小型紧凑连接节点 */
.flow-node--combine-step {
  width: 150px;
  min-height: 36px;
  padding: 5px 8px;
  gap: 6px;
  background: #f3fdf7;
}

.flow-node--invalid {
  background: #fffbeb;
  border-color: #f3e3b3;
}

.flow-node__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(31, 157, 102, 0.12);
  color: var(--is-success);
  flex-shrink: 0;
}
.flow-node--combine-step .flow-node__icon {
  width: 18px;
  height: 18px;
}
.flow-node--invalid .flow-node__icon {
  background: rgba(138, 109, 26, 0.12);
  color: var(--is-warning-text);
}

.flow-node__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.flow-node__label {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
  line-height: 1.3;
}
.flow-node--combine-step .flow-node__label {
  font-size: var(--is-text-xs);
}
.flow-node__sub {
  font-size: 11px;
  color: var(--is-text-secondary);
  line-height: 1.2;
}

.flow-node__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--is-success);
  color: #fff;
  flex-shrink: 0;
}
.flow-node__status--warn {
  background: #e3a008;
}
.flow-node--combine-step .flow-node__status {
  width: 13px;
  height: 13px;
}

/* hover 出现的「打开」按钮 */
.flow-node__open {
  position: absolute;
  top: -8px;
  right: -8px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  color: var(--is-text-secondary);
  box-shadow: var(--is-shadow-sm);
  z-index: 2;
}
.flow-node:hover .flow-node__open {
  display: inline-flex;
}
.flow-node__open:hover {
  color: var(--is-accent);
  border-color: var(--is-accent);
}

/* 连接点：仅作视觉锚点（nodes-connectable=false） */
.flow-node__handle {
  width: 7px;
  height: 7px;
  background: #fff;
  border: 1.5px solid #b6c2cf;
}
</style>
