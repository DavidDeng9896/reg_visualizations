<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { Aggregation, ChartConfigure, FieldMapping } from '../../../shared/types'
import { IFieldCapsule, ISelect, type SelectOption } from '../../../ui'
import { aggregationLabel } from '../runtime/aggregate'
import AxisSettingsPopover from './AxisSettingsPopover.vue'
import { CHART_DRAFT_CONTEXT } from './context'
import type { SlotDef } from '../types'

/** 映射槽位：标签 + 必填* + 字段胶囊（齿轮/×）或字段下拉；缺失列标红。 */
const props = defineProps<{ slot: SlotDef }>()
const ctx = inject(CHART_DRAFT_CONTEXT)!

const colType = (field: string) => ctx.columns.value.find((c) => c.field === field)?.dataType ?? 'string'

const options = computed<SelectOption[]>(() =>
  ctx.columns.value
    .filter((c) => !props.slot.acceptTypes?.length || props.slot.acceptTypes.includes(c.dataType))
    .map((c) => ({ value: c.field, label: c.title, icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const) })),
)

const mappings = computed<FieldMapping[]>(() => {
  const cfg = ctx.draft.configure as ChartConfigure
  if (props.slot.multiple) return cfg.values ?? []
  const m = cfg[props.slot.key as keyof ChartConfigure] as FieldMapping | undefined
  return m?.field ? [m] : []
})

const missingFields = computed(() => {
  const colSet = new Set(ctx.columns.value.map((c) => c.field))
  return new Set(mappings.value.map((m) => m.field).filter((f) => !colSet.has(f)))
})

const error = computed(() => {
  if (!ctx.saveAttempted.value) return undefined
  return ctx.errors.value.find((e) => e.slot === props.slot.key)
})

function setSingle(field: string | number) {
  const cfg = ctx.draft.configure
  const prev = (cfg as unknown as Record<string, FieldMapping | undefined>)[props.slot.key] ?? {}
  ;(cfg as unknown as Record<string, unknown>)[props.slot.key] = { ...prev, field: String(field) }
  ctx.touch()
}

function removeAt(i: number) {
  const cfg = ctx.draft.configure
  if (props.slot.multiple) {
    cfg.values = (cfg.values ?? []).filter((_, idx) => idx !== i)
  } else {
    ;(cfg as unknown as Record<string, unknown>)[props.slot.key] = undefined
  }
  ctx.touch()
}

function addMapping(field: string | number) {
  const cfg = ctx.draft.configure
  if (!cfg.values) cfg.values = []
  if (cfg.values.some((m) => m.field === field)) return
  cfg.values.push({ field: String(field) })
  ctx.touch()
}

const gearFor = ref<number | null>(null)

const axisKeyOf = computed<'xAxis' | 'yAxis'>(() => (props.slot.key === 'x' ? 'xAxis' : 'yAxis'))

const capsuleAgg = (m: FieldMapping): string | undefined =>
  props.slot.aggregatable ? aggregationLabel(m.aggregation ?? 'count') : undefined
</script>

<template>
  <div class="mslot" :class="{ 'mslot--error': !!error }">
    <div class="mslot__head">
      <span class="mslot__label">
        {{ slot.label }}<span v-if="slot.required" class="mslot__req">*</span>
      </span>
    </div>

    <div class="mslot__body">
      <template v-for="(m, i) in mappings" :key="`${m.field}-${i}`">
        <AxisSettingsPopover
          v-if="slot.aggregatable || slot.axisSettings || slot.ySide"
          :open="gearFor === i"
          :slot="slot"
          :mapping="m"
          :axis-key="axisKeyOf"
          @update:open="gearFor = $event ? i : null"
        >
          <template #anchor>
            <IFieldCapsule
              :name="m.field"
              :data-type="colType(m.field)"
              :aggregation="capsuleAgg(m)"
              :configurable="true"
              :removable="true"
              :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
              @configure="gearFor = i"
              @remove="removeAt(i)"
            />
          </template>
        </AxisSettingsPopover>
        <IFieldCapsule
          v-else
          :name="m.field"
          :data-type="colType(m.field)"
          :removable="true"
          :class="{ 'mslot__capsule--missing': missingFields.has(m.field) }"
          @remove="removeAt(i)"
        />
      </template>

      <ISelect
        v-if="slot.multiple || mappings.length === 0"
        :options="options"
        :placeholder="slot.multiple ? '+ 添加度量' : '选择字段'"
        :searchable="options.length > 6"
        size="sm"
        class="mslot__select"
        :aria-label="slot.label"
        :model-value="null"
        @update:model-value="slot.multiple ? addMapping($event) : setSingle($event)"
      />
    </div>

    <p v-if="missingFields.size" class="mslot__msg mslot__msg--missing">
      列 {{ [...missingFields].map((f) => `「${f}」`).join('、') }} 已不存在，请重新绑定
    </p>
    <p v-else-if="error" class="mslot__msg">{{ error.message }}</p>
  </div>
</template>

<style scoped>
.mslot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  border: 1px solid transparent;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.mslot--error {
  border-color: var(--is-danger);
  background: var(--is-danger-soft);
}
.mslot__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mslot__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.mslot__req {
  color: var(--is-danger);
  margin-left: 2px;
}
.mslot__body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mslot__select {
  flex: 1;
  min-width: 120px;
}
.mslot__capsule--missing {
  border-color: var(--is-danger) !important;
  color: var(--is-danger);
  background: var(--is-danger-soft) !important;
}
.mslot__msg {
  font-size: 11px;
  color: var(--is-danger);
}
.mslot__msg--missing {
  color: var(--is-danger);
}
</style>
