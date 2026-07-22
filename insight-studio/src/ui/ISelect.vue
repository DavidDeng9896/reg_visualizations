<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useFloatingPanel } from './floating'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'
import { useClickOutside, useEscape } from './utils'

export interface SelectOption {
  value: string | number
  label: string
  icon?: IconName
  disabled?: boolean
  /** 分组标题；相邻同组选项归为一组。 */
  group?: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options: SelectOption[]
    placeholder?: string
    searchable?: boolean
    disabled?: boolean
    size?: 'sm' | 'md'
    ariaLabel?: string
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void; (e: 'change', v: string | number): void }>()

const rootEl = ref<HTMLElement>()
const panelEl = ref<HTMLElement>()
const searchEl = ref<HTMLInputElement>()
const listEl = ref<HTMLElement>()
const open = ref(false)
const query = ref('')
const activeIndex = ref(-1)

const { style: panelStyle, update: reposition } = useFloatingPanel(
  open,
  rootEl,
  panelEl,
  () => 'bottom-start',
  {
    matchAnchorWidth: true,
    minWidth: 120,
    // Above popover + modal so nested selects in filters/dialogs stay visible
    zIndex: 'var(--is-z-dropdown)',
  },
)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

const filtered = computed(() => {
  if (!query.value.trim()) return props.options
  const q = query.value.trim().toLowerCase()
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

/** 扁平可选项（跳过 disabled 用于键盘导航）。 */
const enabledIndexes = computed(() =>
  filtered.value.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled).map(({ i }) => i),
)

function openPanel() {
  if (props.disabled || open.value) return
  open.value = true
  query.value = ''
  const selIdx = filtered.value.findIndex((o) => o.value === props.modelValue && !o.disabled)
  activeIndex.value = selIdx >= 0 ? selIdx : (enabledIndexes.value[0] ?? -1)
  nextTick(() => {
    reposition()
    if (props.searchable) searchEl.value?.focus()
    scrollActiveIntoView()
  })
}

function closePanel() {
  open.value = false
  query.value = ''
  activeIndex.value = -1
}

function toggle() {
  if (open.value) closePanel()
  else openPanel()
}

function selectAt(i: number) {
  const opt = filtered.value[i]
  if (!opt || opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  closePanel()
}

function moveActive(delta: number) {
  const idxs = enabledIndexes.value
  if (!idxs.length) return
  const cur = idxs.indexOf(activeIndex.value)
  const next = idxs[(cur + delta + idxs.length) % idxs.length]
  activeIndex.value = next
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    listEl.value
      ?.querySelector('.is-select__option--active')
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!open.value) openPanel()
    else moveActive(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  }
}

function onListKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveActive(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveActive(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    selectAt(activeIndex.value)
  }
}

useClickOutside([rootEl, panelEl], () => closePanel())
useEscape(() => closePanel(), () => open.value)

watch(
  () => props.options,
  () => {
    if (open.value) activeIndex.value = enabledIndexes.value[0] ?? -1
  },
)

function showGroupHeader(i: number): string | null {
  const g = filtered.value[i]?.group
  if (!g) return null
  if (i === 0 || filtered.value[i - 1].group !== g) return g
  return null
}
</script>

<template>
  <div ref="rootEl" class="is-select" :class="[`is-select--${size}`, { 'is-select--open': open }]">
    <button
      type="button"
      class="is-select__trigger"
      :disabled="disabled"
      role="combobox"
      :aria-expanded="open"
      :aria-label="ariaLabel ?? placeholder"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <IIcon v-if="selected?.icon" :name="selected.icon" :size="14" class="is-select__trigger-icon" />
      <span class="is-select__value is-ellipsis" :class="{ 'is-select__value--placeholder': !selected }">
        {{ selected?.label ?? placeholder ?? '请选择' }}
      </span>
      <IIcon name="chevron-down" :size="13" class="is-select__chevron" />
    </button>

    <Teleport to="body">
      <Transition name="is-select-panel">
        <div
          v-if="open"
          ref="panelEl"
          class="is-select__panel"
          :style="panelStyle"
          data-is-floating="1"
          role="presentation"
          @click.stop
        >
          <div v-if="searchable" class="is-select__search">
            <input
              ref="searchEl"
              v-model="query"
              class="is-select__search-input"
              type="text"
              placeholder="搜索…"
              aria-label="搜索选项"
              @keydown="onListKeydown"
            />
          </div>
          <div ref="listEl" class="is-select__list" role="listbox" :aria-activedescendant="undefined">
            <template v-for="(opt, i) in filtered" :key="String(opt.value)">
              <div v-if="showGroupHeader(i)" class="is-select__group">{{ opt.group }}</div>
              <button
                type="button"
                class="is-select__option"
                :class="{ 'is-select__option--active': i === activeIndex, 'is-select__option--selected': opt.value === modelValue }"
                role="option"
                :aria-selected="opt.value === modelValue"
                :disabled="opt.disabled"
                @click="selectAt(i)"
                @mousemove="activeIndex = i"
              >
                <IIcon v-if="opt.icon" :name="opt.icon" :size="14" />
                <span class="is-ellipsis">{{ opt.label }}</span>
                <IIcon v-if="opt.value === modelValue" name="check" :size="13" class="is-select__check" />
              </button>
            </template>
            <div v-if="!filtered.length" class="is-select__empty">无匹配选项</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.is-select {
  position: relative;
  display: inline-block;
  min-width: 0;
}
.is-select__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  font-size: var(--is-text-sm);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.is-select--md .is-select__trigger {
  height: 32px;
}
.is-select--sm .is-select__trigger {
  height: 26px;
  font-size: var(--is-text-xs);
}
.is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--open .is-select__trigger,
.is-select__trigger:focus-visible {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring);
}
.is-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.is-select__trigger-icon {
  color: var(--is-text-secondary);
}
.is-select__value {
  flex: 1;
  text-align: left;
}
.is-select__value--placeholder {
  color: var(--is-text-tertiary);
}
.is-select__chevron {
  color: var(--is-text-tertiary);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-select--open .is-select__chevron {
  transform: rotate(180deg);
}

.is-select__panel {
  /* position/top/left from teleported fixed style */
  width: max-content;
  max-width: min(320px, calc(100vw - 16px));
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}
.is-select__search {
  padding: 6px;
  border-bottom: 1px solid var(--is-border);
}
.is-select__search-input {
  width: 100%;
  height: 26px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-size: var(--is-text-xs);
  outline: none;
}
.is-select__search-input:focus {
  border-color: var(--is-accent);
}
.is-select__list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}
.is-select__group {
  padding: 6px 8px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.is-select__option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.is-select__option--active {
  background: var(--is-accent-soft);
}
.is-select__option--selected {
  color: var(--is-accent);
  font-weight: 500;
}
.is-select__option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-select__check {
  margin-left: auto;
}
.is-select__empty {
  padding: 12px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}

.is-select-panel-enter-active,
.is-select-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
  transform-origin: top left;
}
.is-select-panel-enter-from,
.is-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
