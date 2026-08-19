<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { IIcon } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { stepTypeLabel, viewTypeLabel } from './graph'
import { portTypeIcon } from '../steps/registry'

/**
 * 流程图自定义节点：
 * - 步骤：Benchling 风格竖卡（Header + Inputs / Outputs 分区；Data 类浅绿 + ✓；pending 横幅）
 * - 视图：紧凑卡 + 左右锚点
 */
const props = defineProps<{
  id: string
  data: FlowNodeData
  selected?: boolean
}>()

const emit = defineEmits<{ (e: 'open', id: string): void }>()

const isStep = computed(() => props.data.kind === 'step')
const isView = computed(() => props.data.kind === 'view')
const isPythonChart = computed(() => props.data.kind === 'python-chart')
const isCompact = computed(() => isView.value || isPythonChart.value)

const isDataStep = computed(() => {
  const t = props.data.stepType
  return (
    t === 'upload-csv' ||
    t === 'upload-xlsx' ||
    t === 'query-sql' ||
    t === 'import-files' ||
    t === 'file-to-table'
  )
})

const isReportStep = computed(() => props.data.stepType === 'report')

const icon = computed<IconName>(() => {
  const d = props.data
  if (d.kind === 'python-chart') return 'scatter'
  if (d.kind === 'view') return (d.viewType ?? 'table') as IconName
  switch (d.stepType) {
    case 'upload-csv':
    case 'upload-xlsx':
    case 'import-files':
    case 'file-to-table':
      return 'upload'
    case 'query-sql':
      return 'database'
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
    case 'custom-code':
      return 'database'
    case 'report':
      return 'file-text'
    default:
      return 'database'
  }
})

const subLabel = computed(() => {
  const d = props.data
  if (d.kind === 'python-chart') return 'Python chart'
  if (d.kind === 'view') return viewTypeLabel(d.viewType ?? 'table')
  const parts: string[] = []
  if (d.stepType) parts.push(stepTypeLabel(d.stepType))
  if (d.rowCount !== undefined) parts.push(`${d.rowCount} 行`)
  return parts.join(' · ')
})

const statusTitle = computed(() => {
  const s = props.data.status
  if (s === 'running') return '执行中'
  if (s === 'pending') return '待配置'
  if (s === 'failed') return props.data.error || '失败'
  if (s === 'stale') return '上游变更，需重新运行'
  return '已配置'
})

const statusText = computed(() => {
  const s = props.data.status
  if (s === 'running') return 'Running'
  if (s === 'pending') return 'Pending'
  if (s === 'failed') return 'Failed'
  if (s === 'stale') return 'Stale'
  return 'Ready'
})

const showReadyCheck = computed(
  () => isStep.value && isDataStep.value && props.data.status === 'configured',
)

const pendingHint = computed(() => props.data.kind === 'step' && props.data.status === 'pending')
</script>

<template>
  <!-- —— 视图节点（紧凑） —— -->
  <div
    v-if="isCompact"
    class="flow-node flow-node--view"
    :class="{ 'flow-node--python-chart': isPythonChart }"
    :data-node-kind="data.kind"
  >
    <Handle
      v-if="!isPythonChart"
      type="target"
      :position="Position.Left"
      id="in"
      class="flow-node__handle flow-node__handle--view"
    />
    <Handle
      v-else
      type="target"
      :position="Position.Left"
      id="in"
      class="flow-node__handle flow-node__handle--view"
      :connectable="false"
    />
    <Handle v-if="isView" type="source" :position="Position.Right" id="out" class="flow-node__handle flow-node__handle--view" />
    <div class="flow-node__body">
      <div class="flow-node__head">
        <span class="flow-node__icon" aria-hidden="true">
          <IIcon :name="icon" :size="13" />
        </span>
        <span class="flow-node__label is-ellipsis" :title="data.label">{{ data.label }}</span>
      </div>
      <span v-if="subLabel" class="flow-node__sub is-ellipsis">{{ subLabel }}</span>
    </div>
    <button
      v-if="!isPythonChart"
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

  <!-- —— 步骤节点（Benchling 竖卡） —— -->
  <div
    v-else
    class="flow-node flow-node--step"
    :class="{
      'flow-node--data': isDataStep,
      'flow-node--report': isReportStep,
      'flow-node--pending': data.status === 'pending' || (!data.valid && data.status !== 'failed'),
      'flow-node--failed': data.status === 'failed',
    }"
    :data-node-kind="data.kind"
  >
    <div class="flow-node__header">
      <span class="flow-node__icon" aria-hidden="true">
        <IIcon :name="icon" :size="15" />
      </span>
      <div class="flow-node__titles">
        <span class="flow-node__label is-ellipsis" :title="data.label">{{ data.label }}</span>
        <span v-if="subLabel" class="flow-node__sub is-ellipsis">{{ subLabel }}</span>
      </div>
      <span
        v-if="showReadyCheck"
        class="flow-node__check"
        :title="statusTitle"
        aria-label="Ready"
      >
        <IIcon name="check" :size="12" />
      </span>
      <span
        v-else
        class="flow-node__status"
        :class="`flow-node__status--${data.status ?? 'configured'}`"
        :title="statusTitle"
      >
        <IIcon v-if="data.status === 'running'" name="spinner" :size="10" class="flow-node__status-spin" />
        {{ statusText }}
      </span>
    </div>

    <div v-if="pendingHint" class="flow-node__banner">Waiting on step input or configuration.</div>
    <div v-if="data.status === 'failed' && data.error" class="flow-node__banner flow-node__banner--error" :title="data.error">
      {{ data.error }}
    </div>

    <div v-if="data.inputs.length" class="flow-node__section">
      <div class="flow-node__section-title">Inputs</div>
      <div v-for="p in data.inputs" :key="p.name" class="flow-node__port-row flow-node__port-row--in">
        <Handle type="target" :position="Position.Left" :id="p.name" class="flow-node__handle" />
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="11" class="flow-node__port-icon" />
        <span class="flow-node__port-label is-ellipsis">{{ p.name }}</span>
      </div>
    </div>

    <div v-if="data.outputs.length" class="flow-node__section">
      <div class="flow-node__section-title">Outputs</div>
      <div v-for="p in data.outputs" :key="p.name" class="flow-node__port-row flow-node__port-row--out">
        <IIcon :name="(portTypeIcon(p.type) as IconName)" :size="11" class="flow-node__port-icon" />
        <span class="flow-node__port-label is-ellipsis">{{ p.name }}</span>
        <Handle type="source" :position="Position.Right" :id="p.name" class="flow-node__handle" />
      </div>
    </div>

    <button type="button" class="flow-node__open" title="在工作区打开" aria-label="在工作区打开" @click.stop="emit('open', id)" @dblclick.stop>
      <IIcon name="external" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.flow-node {
  position: relative;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: 10px;
  box-shadow: var(--is-shadow-sm);
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
/* 拖拽中禁用 hover 位移，避免与拖拽 transform 叠加抖动 */
:global(.vue-flow__node.dragging) .flow-node:hover {
  transform: none;
}
:global(.vue-flow__node.is-active) .flow-node {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring), var(--is-shadow-md);
}
:global(.vue-flow__node.is-linked) .flow-node {
  border-color: var(--is-accent);
}

/* —— View —— */
.flow-node--view {
  display: flex;
  align-items: stretch;
  min-width: 140px;
  max-width: 240px;
  padding: 6px 10px;
}
.flow-node--view .flow-node__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}
.flow-node--view .flow-node__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flow-node--view .flow-node__icon {
  width: 20px;
  height: 20px;
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
}

/* —— Step（竖卡） —— */
.flow-node--step {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 280px;
  padding: 0;
  overflow: visible;
}
.flow-node--data {
  background: #eefaf3;
  border-color: #b7e4c7;
}
.flow-node--pending {
  border-color: #e8c47a;
}
.flow-node--failed {
  border-color: var(--is-danger);
}

/* 分析报告节点：独立报告卡片，比普通步骤更醒目 */
.flow-node--report {
  min-width: 320px;
  max-width: 420px;
  background: linear-gradient(135deg, #f6f0ff 0%, #eef4ff 100%);
  border-color: #b8a9e8;
}
.flow-node--report .flow-node__header {
  padding: 14px 16px 10px;
}
.flow-node--report .flow-node__label {
  font-size: 14px;
}
.flow-node--report .flow-node__sub {
  font-size: 12px;
}
.flow-node--report .flow-node__icon {
  width: 32px;
  height: 32px;
  background: rgba(124, 92, 191, 0.14);
  color: #6d4fc2;
}

.flow-node__header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px 8px;
}
.flow-node__titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.flow-node__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--is-accent-soft);
  color: var(--is-accent);
  flex-shrink: 0;
}
.flow-node--data .flow-node__icon {
  background: rgba(46, 160, 90, 0.12);
  color: #1b7a45;
}
.flow-node__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--is-text);
  line-height: 1.25;
}
.flow-node__sub {
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.flow-node__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2ea05a;
  color: #fff;
  flex-shrink: 0;
}
.flow-node__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(46, 160, 90, 0.12);
  color: #1b7a45;
  flex-shrink: 0;
}
.flow-node__status--pending {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.flow-node__status--failed {
  background: var(--is-danger-soft);
  color: var(--is-danger);
}
.flow-node__status--stale {
  background: #fff4e5;
  color: #b54708;
}
.flow-node__status--running {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.flow-node__status-spin {
  animation: flow-spin 0.8s linear infinite;
}
@keyframes flow-spin {
  to {
    transform: rotate(360deg);
  }
}

.flow-node__banner {
  margin: 0 10px 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.35;
  background: #fdf3d7;
  color: #8a6d1a;
}
.flow-node__banner--error {
  background: var(--is-danger-soft);
  color: var(--is-danger);
}

.flow-node__section {
  padding: 4px 12px 10px;
  border-top: 1px solid rgba(16, 24, 40, 0.06);
}
.flow-node--data .flow-node__section {
  border-top-color: rgba(46, 160, 90, 0.12);
}
.flow-node__section-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  margin: 4px 0 6px;
}
.flow-node__port-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 2px 0;
}
.flow-node__port-row--in {
  padding-left: 2px;
}
.flow-node__port-row--out {
  padding-right: 2px;
  justify-content: flex-start;
}
.flow-node__port-icon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.flow-node__port-label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--is-text-secondary);
}

.flow-node__open {
  position: absolute;
  top: 6px;
  right: 6px;
  display: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
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
  border: 1.5px solid var(--is-border-strong);
  position: relative;
}
.flow-node__port-row--in .flow-node__handle {
  position: absolute;
  left: -17px;
  top: 50%;
  transform: translateY(-50%);
}
.flow-node__port-row--out .flow-node__handle {
  position: absolute;
  right: -17px;
  top: 50%;
  transform: translateY(-50%);
  margin-left: auto;
}
.flow-node__handle--view {
  position: absolute;
  top: 50%;
  margin: 0;
  z-index: 3;
}
.flow-node__handle--view.vue-flow__handle-left {
  left: 0;
  transform: translate(-50%, -50%);
}
.flow-node__handle--view.vue-flow__handle-right {
  right: 0;
  left: auto;
  transform: translate(50%, -50%);
}
.flow-node__handle::after {
  content: '';
  position: absolute;
  inset: -6px;
}
.flow-node__handle:hover {
  border-color: var(--is-success);
}
</style>
