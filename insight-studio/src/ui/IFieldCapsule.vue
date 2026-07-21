<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { DataType } from '../shared/types'

/** 字段胶囊：Aa/# 类型图标 + 名称 + 可选齿轮 + ×（图表映射槽位用）。 */
const props = withDefaults(
  defineProps<{
    name: string
    dataType?: DataType
    /** 聚合显示（如 'Average of Concentration'）。 */
    aggregation?: string
    removable?: boolean
    configurable?: boolean
    active?: boolean
  }>(),
  { dataType: 'string' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'configure'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-capsule"
    :class="{ 'is-capsule--active': active }"
    :title="`${name}（${dataType}）`"
    role="button"
    tabindex="0"
    @click="emit('click')"
    @keydown.enter="emit('click')"
  >
    <IIcon
      :name="dataType === 'number' ? 'type-number' : 'type-text'"
      :size="13"
      class="is-capsule__type"
    />
    <span class="is-capsule__name is-ellipsis">
      <template v-if="aggregation">{{ aggregation }} of </template>{{ name }}
    </span>
    <button
      v-if="configurable"
      type="button"
      class="is-capsule__action"
      aria-label="字段设置"
      @click.stop="emit('configure')"
    >
      <IIcon name="gear" :size="12" />
    </button>
    <button
      v-if="removable"
      type="button"
      class="is-capsule__action"
      aria-label="移除字段"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="11" />
    </button>
  </span>
</template>

<style scoped>
.is-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 3px 8px;
  background: var(--is-surface-hover);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  color: var(--is-text);
  cursor: default;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-capsule:hover {
  background: #e9edf3;
  border-color: var(--is-border-strong);
}
.is-capsule--active {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
}
.is-capsule__type {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.is-capsule__name {
  min-width: 0;
}
.is-capsule__action {
  display: inline-flex;
  padding: 2px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.is-capsule__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}
</style>
