<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PortType, StepType } from '../../shared/types'
import { IButton, IIcon, ITextField } from '../../ui'
import type { IconName } from '../../ui'
import { listStepDefs, portTypeIcon, type StepDef } from '../steps/registry'
import { IMPLEMENTED_STEP_TYPES } from '../steps/exec'

/**
 * Add step 目录面板：从输出端口拖线到空白处后滑出。
 * 仅展示「已实现执行逻辑且输入端口与源端口类型兼容」的步骤；
 * 支持搜索、分类分组、description 开关。
 */
const props = defineProps<{
  open: boolean
  source: { nodeId: string; port: string } | null
  /** 源端口数据类型（table/file/chart），用于过滤可连接的步骤。 */
  sourcePortType?: PortType | null
}>()

const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'select', type: StepType): void }>()

const query = ref('')
const showDescriptions = ref(true)

/** 可添加的步骤：已实现 + 有输入端口 + 与源端口类型兼容。 */
const availableDefs = computed(() => {
  const q = query.value.trim().toLowerCase()
  return listStepDefs().filter((d) => {
    if (!IMPLEMENTED_STEP_TYPES.has(d.type)) return false
    if (d.inputs.length === 0) return false
    if (props.sourcePortType && !d.inputs.some((p) => p.type === props.sourcePortType)) return false
    if (q && !d.label.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q)) return false
    return true
  })
})

const groups = computed(() => {
  const out: { key: string; title: string; defs: StepDef[] }[] = [
    { key: 'combine', title: 'Combine tables', defs: [] },
    { key: 'transform', title: 'Transform', defs: [] },
    { key: 'statistics', title: 'Statistics', defs: [] },
  ]
  for (const def of availableDefs.value) {
    const g = out.find((o) => o.key === def.category)
    if (g) g.defs.push(def)
  }
  return out.filter((g) => g.defs.length > 0)
})

function close() {
  emit('update:open', false)
}

function select(type: StepType) {
  emit('select', type)
}
</script>

<template>
  <Transition name="add-step">
    <aside v-if="open" class="add-step" @keydown.esc.stop="close">
      <header class="add-step__header">
        <h3 class="add-step__title">Add step</h3>
        <button type="button" class="add-step__close" aria-label="关闭" @click="close">
          <IIcon name="close" :size="14" />
        </button>
      </header>

      <div class="add-step__search">
        <ITextField v-model="query" placeholder="Search steps…" prefix-icon="search" clearable size="sm" />
      </div>

      <div class="add-step__body">
        <div v-for="group in groups" :key="group.key" class="add-step__group">
          <h4 class="add-step__group-title">{{ group.title }}</h4>
          <button
            v-for="def in group.defs"
            :key="def.type"
            type="button"
            class="add-step__item"
            @click="select(def.type)"
          >
            <span class="add-step__icon">
              <IIcon :name="(portTypeIcon(def.outputs[0]?.type ?? 'table') as IconName)" :size="14" />
            </span>
            <span class="add-step__item-body">
              <span class="add-step__item-name">{{ def.label }}</span>
              <span v-if="showDescriptions" class="add-step__item-desc">{{ def.description }}</span>
            </span>
          </button>
        </div>
        <div v-if="!groups.length" class="add-step__empty">无匹配步骤</div>
      </div>

      <label class="add-step__desc-toggle">
        <input v-model="showDescriptions" type="checkbox" />
        <span>Step descriptions</span>
      </label>
    </aside>
  </Transition>
</template>

<style scoped>
.add-step {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: 8;
  display: flex;
  flex-direction: column;
}
.add-step__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.add-step__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.add-step__close {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.add-step__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.add-step__search {
  padding: 12px 16px;
}
.add-step__desc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--is-border);
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  cursor: pointer;
}
.add-step__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 12px 16px;
}
.add-step__group + .add-step__group {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--is-border);
}
.add-step__group-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  padding: 8px 4px 6px;
}
.add-step__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border-radius: var(--is-radius-sm);
  text-align: left;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.add-step__item:hover {
  background: var(--is-surface-hover);
}
.add-step__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.add-step__item:hover .add-step__icon {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.add-step__item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.add-step__item-name {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text);
}
.add-step__item-desc {
  font-size: 11px;
  color: var(--is-text-tertiary);
  line-height: 1.35;
}
.add-step__empty {
  padding: 24px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}

.add-step-enter-active,
.add-step-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.add-step-enter-from,
.add-step-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
