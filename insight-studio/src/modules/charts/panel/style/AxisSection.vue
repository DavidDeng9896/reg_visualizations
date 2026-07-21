<script setup lang="ts">
import { computed, inject } from 'vue'
import { IButton, ISelect, ITextField, IToggle } from '../../../../ui'
import { CHART_DRAFT_CONTEXT } from '../context'

/** STYLE 轴区段：Label(+刷新) / Scale / Range。 */
const props = withDefaults(
  defineProps<{
    title: string
    axisKey: 'xAxis' | 'yAxis' | 'yAxisRight'
    /** 默认轴标签（刷新恢复目标）。 */
    defaultLabel?: string
    withScale?: boolean
  }>(),
  { withScale: true },
)

const ctx = inject(CHART_DRAFT_CONTEXT)!

const spec = computed(() => {
  const style = ctx.draft.style
  if (!style[props.axisKey]) style[props.axisKey] = {}
  return style[props.axisKey]!
})

const label = computed({
  get: () => spec.value.label ?? '',
  set: (v: string) => {
    if (v.trim()) spec.value.label = v
    else delete spec.value.label
    ctx.touch()
  },
})
const range = computed({
  get: () => spec.value.range ?? 'auto',
  set: (v: string | number) => {
    spec.value.range = v === 'manual' ? 'manual' : 'auto'
    ctx.touch()
  },
})
const scale = computed({
  get: () => spec.value.scale ?? 'linear',
  set: (v: string | number) => {
    spec.value.scale = v === 'log' ? 'log' : 'linear'
    ctx.touch()
  },
})
const minStr = computed({
  get: () => (spec.value.min === undefined ? '' : String(spec.value.min)),
  set: (v: string) => {
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) delete spec.value.min
    else spec.value.min = n
    ctx.touch()
  },
})
const maxStr = computed({
  get: () => (spec.value.max === undefined ? '' : String(spec.value.max)),
  set: (v: string) => {
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) delete spec.value.max
    else spec.value.max = n
    ctx.touch()
  },
})

function resetLabel() {
  delete spec.value.label
  ctx.touch()
}
</script>

<template>
  <section class="axis-sec">
    <h4 class="axis-sec__title">{{ title }}</h4>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Label</span>
      <ITextField v-model="label" size="sm" :placeholder="defaultLabel ?? '默认'" />
      <IButton size="sm" variant="ghost" icon="undo" title="恢复默认标签" @click="resetLabel" />
    </div>
    <div v-if="withScale" class="axis-sec__row">
      <span class="axis-sec__label">Scale</span>
      <IToggle :model-value="scale === 'log'" @update:model-value="scale = $event ? 'log' : 'linear'">
        {{ scale === 'log' ? 'Log' : 'Linear' }}
      </IToggle>
    </div>
    <div class="axis-sec__row">
      <span class="axis-sec__label">Range</span>
      <ISelect
        v-model="range"
        :options="[
          { value: 'auto', label: 'Automatic' },
          { value: 'manual', label: 'Manual (min/max)' },
        ]"
        size="sm"
        aria-label="Range"
      />
    </div>
    <div v-if="range === 'manual'" class="axis-sec__row">
      <span class="axis-sec__label"></span>
      <ITextField v-model="minStr" size="sm" placeholder="Min" aria-label="最小值" />
      <ITextField v-model="maxStr" size="sm" placeholder="Max" aria-label="最大值" />
    </div>
  </section>
</template>

<style scoped>
.axis-sec {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px;
  border-top: 1px solid var(--is-border);
}
.axis-sec__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.axis-sec__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.axis-sec__label {
  flex-shrink: 0;
  width: 64px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.axis-sec__row :deep(.is-select),
.axis-sec__row :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
</style>
