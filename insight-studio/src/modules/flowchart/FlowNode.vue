<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { IIcon } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { stepTypeLabel, viewTypeLabel } from './graph'
import { portTypeIcon } from '../steps/registry'

/**
 * 流程图自定义节点（基于 StepNode + ViewNode）：
 * - 步骤节点：浅绿底圆角卡 + 端口分组 + 三态圆点 + 打开按钮。
 * - 视图节点：紧凑卡，无端口，点击打开工作区。
 */
const props = defineProps<{
  id: string
  data: FlowNodeData
  selected?: boolean
}>()

const emit = defineEmits<{ (e: 'open', id: string): void }>()

const isStep = computed(() => props.data.kind === 'step')
const isView = computed(() => props.data.kind === 'view')

const icon = computed<IconName>(() => {
  const d = props.data
  if (d.kind === 'view') return (d.viewType ?? 'table') as IconName
  // step
  switch (d.stepType) {
    case 'upload-csv':
    case 'import-files':
    case 'file-to-table':
      return 'upload'
    case 'join':
    case 'union':
      return 'combine'
    case 'filter':
      return 'filter'
    case 'hide-columns':
      return 'table'
    case 'computed-column':
      return 'type-number'
    case 'interpolation':
      return 'line'
    default:
      return 'database'
  }
})

const subLabel = computed(() => {
  const d = props.data
  if (d.kind === 'view') return viewTypeLabel(d.viewType ?? 'table')
  const parts: string[] = []
  if (d.stepType) parts.push(stepTypeLabel(d.stepType))
  if (d.rowCount !== undefined) parts.push(`${d.rowCount} 行`)
  return parts.join(' · ')
})

const statusClass = computed(() => {
  const s = props.data.status
  if (s === 'running') return 'flow-node__status--running'
  if (s === 'pending') return 'flow-node__status--pending'
  if (s === 'failed') return 'flow-node__status--failed'
  if (s === 'stale') return 'flow-node__status--stale'
  return ''
})

const statusTitle = computed(() => {
  const s = props.data.status
  if (s === 'running') return '执行中'
  if (s === 'pending') return '待配置'
  if (s === 'failed') return props.data.error || '失败'
  if (s === 'stale') return '上游变更，需重新运行'
  return '已配置'
})

/** 待配置节点在卡片内提示一行小字（对齐 Benchling 行为）。 */
const pendingHint = computed(() => props.data.kind === 'step' && props.data.status === 'pending')
</script>

<template>
  <div
    class="flow-node"
    :class="[
      `flow-node--${data.kind}`,
      {
        'flow-node--pending': data.status === 'pending' || (!data.valid && data.status !== 'failed'),
        'flow-node--failed': data.status === 'failed',
      },
    ]"
    :data-node-kind="data.kind"
  >
    <!-- 输入端口（步骤节点） -->
    <div v-if="isStep" class="flow-node__ports flow-node__ports--input">
      <div v-for="p in data.inputs" :key="p.name" class="flow-node__port-wrap">
        <Handle type="target" :position="Position.Left" :id="p.name" class="flow-node__handle" />
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="10" class="flow-node__port-icon" />
        <span class="flow-node__port-label">{{ p.name }}</span>
      </div>
    </div>

    <div class="flow-node__body">
      <div class="flow-node__head">
        <span class="flow-node__icon" aria-hidden="true">
          <IIcon :name="icon" :size="isView ? 13 : 15" />
        </span>
        <span class="flow-node__label is-ellipsis" :title="data.label">{{ data.label }}</span>
        <span class="flow-node__status" :class="statusClass" :title="statusTitle">
          <IIcon v-if="data.status === 'running'" name="spinner" :size="10" />
          <IIcon v-else-if="data.status === 'pending'" name="warning" :size="10" />
          <IIcon v-else-if="data.status === 'failed'" name="close" :size="10" />
          <IIcon v-else name="check" :size="10" />
        </span>
      </div>
      <span v-if="subLabel" class="flow-node__sub is-ellipsis">{{ subLabel }}</span>
      <span v-if="pendingHint" class="flow-node__pending-hint">Waiting on step input or configuration.</span>
      <span v-if="data.status === 'failed' && data.error" class="flow-node__error-hint is-ellipsis" :title="data.error">{{ data.error }}</span>
    </div>

    <!-- 输出端口（步骤节点） -->
    <div v-if="isStep" class="flow-node__ports flow-node__ports--output">
      <div v-for="p in data.outputs" :key="p.name" class="flow-node__port-wrap">
        <span class="flow-node__port-label">{{ p.name }}</span>
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="10" class="flow-node__port-icon" />
        <Handle type="source" :position="Position.Right" :id="p.name" class="flow-node__handle" />
      </div>
    </div>

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
  </div>
</template>

<style scoped>
.flow-node {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 6px;
  min-width: 210px;
  max-width: 320px;
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
:global(.vue-flow__node.is-active) .flow-node {
  border-color: var(--is-success);
  box-shadow:
    0 0 0 2px rgba(31, 157, 102, 0.25),
    var(--is-shadow-md);
}
:global(.vue-flow__node.is-linked) .flow-node {
  border-color: #7ccba4;
}

.flow-node--pending {
  background: #fffbeb;
  border-color: #f3e3b3;
}
.flow-node--failed {
  background: #fef3f2;
  border-color: #fecdca;
}
.flow-node--view {
  min-width: 140px;
  padding: 6px 10px;
  background: #f7f9fb;
  border-color: var(--is-border);
}

.flow-node__ports {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 12px;
}
.flow-node__ports--input {
  margin-left: -16px;
  padding-right: 4px;
}
.flow-node__ports--output {
  margin-right: -16px;
  padding-left: 4px;
  align-items: flex-end;
}
.flow-node__port-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 20px;
}
.flow-node__port-label {
  font-size: 10px;
  color: var(--is-text-tertiary);
  white-space: nowrap;
}

.flow-node__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}
.flow-node__head {
  display: flex;
  align-items: center;
  gap: 6px;
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
.flow-node--view .flow-node__icon {
  width: 20px;
  height: 20px;
  background: rgba(102, 112, 133, 0.12);
  color: var(--is-text-secondary);
}
.flow-node--pending .flow-node__icon {
  background: rgba(138, 109, 26, 0.12);
  color: var(--is-warning-text);
}
.flow-node--failed .flow-node__icon {
  background: rgba(180, 35, 24, 0.12);
  color: var(--is-danger);
}
.flow-node__pending-hint {
  font-size: 10px;
  color: var(--is-warning-text);
  line-height: 1.3;
}
.flow-node__error-hint {
  font-size: 10px;
  color: var(--is-danger);
  line-height: 1.3;
}
.flow-node__port-icon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.flow-node__label {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
  line-height: 1.3;
  flex: 1;
  min-width: 0;
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
.flow-node__status--pending {
  background: #e3a008;
}
.flow-node__status--running {
  background: var(--is-accent);
  animation: spin 1s linear infinite;
}
.flow-node__status--failed {
  background: var(--is-danger);
}
.flow-node__status--stale {
  background: var(--is-text-tertiary);
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

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

.flow-node__handle {
  width: 10px;
  height: 10px;
  background: #fff;
  border: 1.5px solid #b6c2cf;
  position: relative;
}
/* 扩大端口点击热区，提升拖线命中率（对齐 Benchling 端口可点性） */
.flow-node__handle::after {
  content: '';
  position: absolute;
  inset: -6px;
}
.flow-node__handle:hover {
  border-color: var(--is-success);
  transform: scale(1.25);
}
</style>
