<script setup lang="ts">
import { computed, inject } from 'vue'
import type { Aggregation, FieldMapping } from '../../../shared/types'
import { IPopover, ISelect, ITextField, IToggle, IButton } from '../../../ui'
import { aggregationLabel } from '../runtime/aggregate'
import { CHART_DRAFT_CONTEXT } from './context'
import type { SlotDef } from '../types'

/**
 * 齿轮弹层：Custom label / Range(Auto·Manual) / Scale(Linear·Log) / 聚合方式 / Y Axis Side。
 * 轴设置写入 draft.style[axisKey]；聚合与 side 写入 mapping 本身。
 */
const props = defineProps<{
  slot: SlotDef
  /** 槽位中的 FieldMapping（就地编辑）。 */
  mapping: FieldMapping
  /** 轴设置存储位置。 */
  axisKey: 'xAxis' | 'yAxis' | 'yAxisRight'
}>()

const open = defineModel<boolean>('open', { default: false })
const ctx = inject(CHART_DRAFT_CONTEXT)!

const AGG_OPTIONS = [
  { value: 'count', label: 'Count (non-blank)' },
  { value: 'sum', label: 'Sum' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'mean', label: 'Average (Mean)' },
  { value: 'median', label: 'Median' },
]

const axisSpec = computed(() => {
  const style = ctx.draft.style
  if (!style[props.axisKey]) style[props.axisKey] = {}
  return style[props.axisKey]!
})

const range = computed({
  get: () => axisSpec.value.range ?? 'auto',
  set: (v: string | number) => {
    axisSpec.value.range = v === 'manual' ? 'manual' : 'auto'
    ctx.touch()
  },
})
const scale = computed({
  get: () => axisSpec.value.scale ?? 'linear',
  set: (v: string | number) => {
    axisSpec.value.scale = v === 'log' ? 'log' : 'linear'
    ctx.touch()
  },
})
const customLabel = computed({
  get: () => axisSpec.value.label ?? '',
  set: (v: string) => {
    if (v.trim()) axisSpec.value.label = v
    else delete axisSpec.value.label
    ctx.touch()
  },
})
const minStr = computed({
  get: () => (axisSpec.value.min === undefined ? '' : String(axisSpec.value.min)),
  set: (v: string) => {
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) delete axisSpec.value.min
    else axisSpec.value.min = n
    ctx.touch()
  },
})
const maxStr = computed({
  get: () => (axisSpec.value.max === undefined ? '' : String(axisSpec.value.max)),
  set: (v: string) => {
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) delete axisSpec.value.max
    else axisSpec.value.max = n
    ctx.touch()
  },
})

const agg = computed({
  get: () => props.mapping.aggregation ?? 'count',
  set: (v: string | number) => {
    props.mapping.aggregation = v as Aggregation
    ctx.touch()
  },
})

const side = computed({
  get: () => props.mapping.axis?.side ?? 'left',
  set: (v: string | number) => {
    if (!props.mapping.axis) props.mapping.axis = {}
    props.mapping.axis.side = v === 'right' ? 'right' : 'left'
    ctx.touch()
  },
})

function resetLabel() {
  delete axisSpec.value.label
  ctx.touch()
}

const aggLabelPreview = computed(() => aggregationLabel(props.mapping.aggregation ?? 'count'))
</script>

<template>
  <IPopover :open="open" placement="bottom-end" :arrow="false" panel-class="axis-pop" @update:open="open = $event">
    <template #anchor>
      <span class="axis-pop__anchor"><slot name="anchor" /></span>
    </template>
    <template #default>
      <div class="axis-pop__body">
        <div v-if="slot.aggregatable" class="axis-pop__row">
          <span class="axis-pop__label">聚合方式</span>
          <ISelect v-model="agg" :options="AGG_OPTIONS" size="sm" aria-label="聚合方式" />
          <span class="axis-pop__hint">{{ aggLabelPreview }} of {{ mapping.field }}</span>
        </div>

        <div v-if="slot.ySide" class="axis-pop__row">
          <span class="axis-pop__label">Y Axis Side</span>
          <ISelect
            v-model="side"
            :options="[
              { value: 'left', label: 'Left（左轴）' },
              { value: 'right', label: 'Right（右轴）' },
            ]"
            size="sm"
            aria-label="Y Axis Side"
          />
        </div>

        <template v-if="slot.axisSettings">
          <div class="axis-pop__row">
            <span class="axis-pop__label">Custom label</span>
            <ITextField v-model="customLabel" size="sm" placeholder="默认：字段名" @escape="open = false" />
            <IButton size="sm" variant="ghost" icon="undo" title="恢复默认标签" @click="resetLabel" />
          </div>
          <div class="axis-pop__row">
            <span class="axis-pop__label">Range</span>
            <ISelect
              v-model="range"
              :options="[
                { value: 'auto', label: 'Automatic' },
                { value: 'manual', label: 'Manual (min/max)' },
              ]"
              size="sm"
              aria-label="轴 Range"
            />
          </div>
          <div v-if="range === 'manual'" class="axis-pop__row axis-pop__row--range">
            <ITextField v-model="minStr" size="sm" placeholder="Min" aria-label="轴最小值" />
            <span class="axis-pop__hint">–</span>
            <ITextField v-model="maxStr" size="sm" placeholder="Max" aria-label="轴最大值" />
          </div>
          <div class="axis-pop__row">
            <span class="axis-pop__label">Scale</span>
            <IToggle :model-value="scale === 'log'" @update:model-value="scale = $event ? 'log' : 'linear'">
              {{ scale === 'log' ? 'Log' : 'Linear' }}
            </IToggle>
          </div>
        </template>
      </div>
    </template>
  </IPopover>
</template>

<style scoped>
.axis-pop__anchor {
  display: inline-flex;
}
.axis-pop__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  min-width: 260px;
}
.axis-pop__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.axis-pop__row--range > * {
  flex: 1;
}
.axis-pop__label {
  flex-shrink: 0;
  width: 84px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.axis-pop__hint {
  font-size: 11px;
  color: var(--is-text-tertiary);
  white-space: nowrap;
}
.axis-pop__row :deep(.is-select) {
  flex: 1;
}
</style>
