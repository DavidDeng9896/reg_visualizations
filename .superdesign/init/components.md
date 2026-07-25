# Components — 共享 UI 原语（`insight-studio/src/ui/`）

> 项目**不依赖任何 UI 组件库**（无 Element Plus / Naive UI；vxe-table 仅作表格底座），
> 全部 UI 原语手写于 `insight-studio/src/ui/`，统一 `is-` BEM 类名前缀 + CSS 变量令牌（见 `theme.md`）。
> 所有组件均为 `<script setup lang="ts">` + `<style scoped>`。
> 统一出口：`src/ui/index.ts`（全部具名导出，业务代码一律 `import { IButton, ... } from '../../ui'`）。

## 目录

| 组件 | 文件 | 一句话描述 | 关键 props |
|---|---|---|---|
| IButton | `src/ui/IButton.vue` | 按钮（4 变体 × 2 尺寸，图标/loading） | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md`, `icon`, `loading`, `disabled` |
| IIcon | `src/ui/IIcon.vue` | 内联 SVG 图标渲染器（stroke/fill/text 三类） | `name: IconName`, `size`（默认 14） |
| icons | `src/ui/icons.ts` | 56 个图标的注册表（`Aa`/`#` 为 text 图标） | `ICONS: Record<IconName, IconDef>` |
| ITextField | `src/ui/ITextField.vue` | 文本输入框（前缀图标/清除/错误态） | `modelValue`, `size: sm\|md`, `prefixIcon`, `clearable`, `error`; expose `focus()/select()` |
| ISelect | `src/ui/ISelect.vue` | 下拉（搜索/分组/键盘导航；**ghost 无框变体用于图种切换**） | `modelValue`, `options: SelectOption[]`, `searchable`, `variant: outline\|ghost`, `size` |
| IPopover | `src/ui/IPopover.vue` | 锚定浮层（teleport 到 body，箭头可选） | `open`, `placement: bottom-start\|bottom-end\|top-start\|right-start`, `arrow`, `closeOnOutside`; slots `anchor`/`default` |
| IModal | `src/ui/IModal.vue` | 弹窗（居中 / 右侧抽屉，焦点圈定） | `open`, `title`, `variant: center\|drawer`, `width`, `closeOnOverlay`; slots `header`/`default`/`footer` |
| ITabs | `src/ui/ITabs.vue` | 下划线指示器 Tabs（CONFIGURE/STYLE 用） | `modelValue`, `tabs: TabItem[]` |
| ITooltip | `src/ui/ITooltip.vue` | 悬停文字提示（默认 300ms 延迟） | `content`, `placement: top\|bottom`, `delay` |
| IToggle | `src/ui/IToggle.vue` | 开关 | `modelValue: boolean`, `label`, `disabled` |
| ISlider | `src/ui/ISlider.vue` | 滑杆（尾部数值显示） | `modelValue: number`, `min`, `max`, `step`, `showValue`, `format` |
| IColorSwatch | `src/ui/IColorSwatch.vue` | 单个色块（选中态双圈） | `color`, `selected`, `size`（默认 20）; emit `select` |
| IColorPicker | `src/ui/IColorPicker.vue` | 取色器（8 列预设色板 + hex 输入） | `modelValue`, `presets` |
| colors | `src/ui/colors.ts` | `PRESET_COLORS` 预设色板（Benchling 风格 16 色） | — |
| IFieldCapsule | `src/ui/IFieldCapsule.vue` | 字段胶囊（Aa/# 类型图标 + 名称 + 齿轮/×） | `name`, `dataType: string\|number`, `aggregation`, `removable`, `configurable`, `active` |
| IEmptyState | `src/ui/IEmptyState.vue` | 空态（圆形图标位 + 标题 + 描述 + CTA 槽） | `icon`, `title`, `description`; slots `illustration`/`default` |
| IBadge | `src/ui/IBadge.vue` | 圆角 chip/徽标（5 色调，可移除/可点击） | `tone: gray\|blue\|green\|yellow\|red`, `icon`, `removable`, `clickable` |
| ISplitPane | `src/ui/ISplitPane.vue` | 可拖拽双栏（双击复位、记住比例、键盘可调） | `direction: horizontal\|vertical`, `ratio`, `defaultRatio`, `minFirst`, `minSecond`, `storageKey`; slots `first`/`second` |
| toast + ToastHost | `src/ui/toast.ts`, `src/ui/ToastHost.vue` | 全局 toast service（相同消息合并 ×N） | `toast.success/warning/error/info(msg, {title, duration})` |
| floating | `src/ui/floating.ts` | 浮层定位 composable（视口翻转/夹取，滚动跟随） | `useFloatingPanel(open, anchorEl, panelEl, placement, opts)` |
| utils | `src/ui/utils.ts` | `useClickOutside` / `useEscape` / `FOCUSABLE_SELECTOR` | — |

以下按文件给出**完整源码**。

## `src/ui/index.ts`

```ts
export { default as IButton } from './IButton.vue'
export { default as IIcon } from './IIcon.vue'
export { default as ITextField } from './ITextField.vue'
export { default as ISelect } from './ISelect.vue'
export { default as IPopover } from './IPopover.vue'
export { default as IModal } from './IModal.vue'
export { default as ITabs } from './ITabs.vue'
export { default as ITooltip } from './ITooltip.vue'
export { default as IToggle } from './IToggle.vue'
export { default as ISlider } from './ISlider.vue'
export { default as IColorSwatch } from './IColorSwatch.vue'
export { default as IColorPicker } from './IColorPicker.vue'
export { default as IFieldCapsule } from './IFieldCapsule.vue'
export { default as IEmptyState } from './IEmptyState.vue'
export { default as IBadge } from './IBadge.vue'
export { default as ISplitPane } from './ISplitPane.vue'
export { default as ToastHost } from './ToastHost.vue'

export { ICONS } from './icons'
export type { IconName } from './icons'
export type { SelectOption } from './ISelect.vue'
export type { TabItem } from './ITabs.vue'
export type { ButtonVariant, ButtonSize } from './IButton.vue'
export type { BadgeTone } from './IBadge.vue'
export { toast, useToastItems } from './toast'
export type { ToastKind, ToastItem } from './toast'
export { PRESET_COLORS } from './colors'
```

## `src/ui/IButton.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: IconName
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    title?: string
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const isDisabled = computed(() => props.disabled || props.loading)

function onClick(ev: MouseEvent) {
  if (isDisabled.value) return
  emit('click', ev)
}
</script>

<template>
  <button
    class="is-btn"
    :class="[`is-btn--${variant}`, `is-btn--${size}`, { 'is-btn--loading': loading, 'is-btn--icon-only': icon && !$slots.default }]"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :title="title"
    @click="onClick"
  >
    <span v-if="loading" class="is-btn__spinner" aria-hidden="true" />
    <IIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 13 : 15" />
    <span v-if="$slots.default" class="is-btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.is-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--is-radius-sm);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease),
    opacity var(--is-dur-fast) var(--is-ease);
}
.is-btn--md {
  height: 32px;
  padding: 0 14px;
  font-size: var(--is-text-sm);
}
.is-btn--sm {
  height: 28px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
}
.is-btn--icon-only.is-btn--md {
  width: 32px;
  padding: 0;
}
.is-btn--icon-only.is-btn--sm {
  width: 28px;
  padding: 0;
}

.is-btn--primary {
  background: var(--is-primary);
  color: var(--is-text-inverse);
}
.is-btn--primary:hover:not(:disabled) {
  background: var(--is-primary-hover);
}
.is-btn--primary:active:not(:disabled) {
  background: var(--is-primary-active);
}

.is-btn--secondary {
  background: var(--is-surface);
  border-color: var(--is-border-strong);
  color: var(--is-text);
  box-shadow: var(--is-shadow-sm);
}
.is-btn--secondary:hover:not(:disabled) {
  background: var(--is-surface-hover);
  border-color: var(--is-text-tertiary);
}

.is-btn--ghost {
  background: transparent;
  color: var(--is-text-secondary);
}
.is-btn--ghost:hover:not(:disabled) {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.is-btn--danger {
  background: var(--is-danger);
  color: var(--is-text-inverse);
}
.is-btn--danger:hover:not(:disabled) {
  background: var(--is-danger-hover);
}

.is-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-btn:focus-visible {
  box-shadow: var(--is-ring);
}

.is-btn__spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: is-btn-spin 0.7s linear infinite;
}
@keyframes is-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

## `src/ui/IIcon.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const def = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="is-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <text
      v-if="def.kind === 'text'"
      x="12"
      y="16.5"
      text-anchor="middle"
      fill="currentColor"
      :font-size="name === 'type-number' ? 15 : 12"
      font-weight="600"
      font-family="var(--is-font)"
      >{{ def.text }}</text
    >
    <g
      v-else-if="def.kind === 'stroke'"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="def.content"
    />
    <g v-else fill="currentColor" v-html="def.content" />
  </svg>
</template>

<style scoped>
.is-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
```

## `src/ui/icons.ts`

```ts
/**
 * 内联 SVG 图标库（24×24 viewBox，stroke=currentColor）。
 * 每个条目为 <svg> 内部内容；`text` 类型用 fill 渲染字符（Aa / #）。
 */
export type IconName =
  | 'type-text'
  | 'type-number'
  | 'table'
  | 'bar'
  | 'line'
  | 'scatter'
  | 'box'
  | 'pie'
  | 'heatmap'
  | 'gear'
  | 'sliders'
  | 'close'
  | 'plus'
  | 'check'
  | 'warning'
  | 'info'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-right'
  | 'swap'
  | 'filter'
  | 'download'
  | 'upload'
  | 'drag'
  | 'search'
  | 'more'
  | 'flowchart'
  | 'combine'
  | 'database'
  | 'plate'
  | 'trash'
  | 'edit'
  | 'external'
  | 'dot'
  | 'folder'
  | 'link'
  | 'undo'
  | 'redo'
  | 'eye'
  | 'eye-off'
  | 'sort-asc'
  | 'sort-desc'
  | 'level-up'
  | 'calendar'
  | 'columns'
  | 'flag'
  | 'expand'
  | 'minus'
  | 'spinner'
  | 'play'

interface IconDef {
  /** stroke 图标（默认）或 text 图标。 */
  kind: 'stroke' | 'text' | 'fill'
  content: string
  text?: string
}

const S = (content: string): IconDef => ({ kind: 'stroke', content })
const T = (text: string): IconDef => ({ kind: 'text', content: '', text })
const F = (content: string): IconDef => ({ kind: 'fill', content })

export const ICONS: Record<IconName, IconDef> = {
  'type-text': T('Aa'),
  'type-number': T('#'),
  table: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M10 10v10"/>'),
  bar: S('<path d="M5 20v-7"/><path d="M10 20V5"/><path d="M15 20v-10"/><path d="M20 20v-14"/><path d="M3 20h18"/>'),
  line: S('<path d="M3 17l5-6 4 3 6-8"/><circle cx="8" cy="11" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="18" cy="6" r="1.2"/>'),
  scatter: F('<circle cx="7" cy="17" r="1.8"/><circle cx="11" cy="9" r="1.8"/><circle cx="15" cy="14" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="7" r="1.8"/>'),
  box: S('<rect x="7" y="8" width="10" height="8" rx="1"/><path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h3"/><path d="M17 12h3"/><path d="M9 4h6"/><path d="M9 20h6"/>'),
  pie: S('<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/><path d="M12 12l6.5 6.2"/>'),
  heatmap: F('<rect x="3" y="3" width="5" height="5" rx="1" opacity=".35"/><rect x="9.5" y="3" width="5" height="5" rx="1" opacity=".7"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="9.5" width="5" height="5" rx="1" opacity=".7"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1" opacity=".35"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1" opacity=".35"/><rect x="16" y="16" width="5" height="5" rx="1" opacity=".7"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>'),
  sliders: S('<path d="M5 6h6M15 6h4M5 12h12M21 12h-2M5 18h8M17 18h2"/><circle cx="13" cy="6" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="15" cy="18" r="1.6"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  warning: S('<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".4"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".4"/>'),
  'chevron-down': S('<path d="M6 9l6 6 6-6"/>'),
  'chevron-up': S('<path d="M6 15l6-6 6 6"/>'),
  'chevron-left': S('<path d="M15 6l-6 6 6 6"/>'),
  'chevron-right': S('<path d="M9 6l6 6-6 6"/>'),
  'arrow-right': S('<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>'),
  swap: S('<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 12l4 4-4 4"/><path d="M21 16H7"/>'),
  filter: S('<path d="M3 5h18l-7 8v5.5L10 21v-8z"/>'),
  download: S('<path d="M12 3v11"/><path d="M8 10l4 4 4-4"/><path d="M4 20h16"/>'),
  upload: S('<path d="M12 14V3"/><path d="M8 7l4-4 4 4"/><path d="M4 20h16"/>'),
  drag: F('<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16 16"/>'),
  more: F('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  flowchart: S('<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M10 6h4a2 2 0 012 2v7"/>'),
  combine: S('<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'),
  database: S('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
  plate: S('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r=".8"/><circle cx="12" cy="10" r=".8"/><circle cx="16" cy="10" r=".8"/><circle cx="8" cy="14" r=".8"/><circle cx="12" cy="14" r=".8"/><circle cx="16" cy="14" r=".8"/>'),
  trash: S('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>'),
  edit: S('<path d="M4 20l.9-3.9L16.6 4.4a2.1 2.1 0 013 3L7.9 19.1z"/>'),
  external: S('<path d="M10 5H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"/><path d="M14 4h6v6"/><path d="M20 4L11 13"/>'),
  dot: F('<circle cx="12" cy="12" r="4"/>'),
  folder: S('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
  link: S('<path d="M10 14a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.1"/><path d="M14 10a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1.2-1.1"/>'),
  undo: S('<path d="M4 7v6h6"/><path d="M4 13a9 9 0 109-9 9.4 9.4 0 00-6.7 2.8L4 9"/>'),
  redo: S('<path d="M20 7v6h-6"/><path d="M20 13a9 9 0 10-9-9 9.4 9.4 0 016.7 2.8L20 9"/>'),
  eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  'eye-off': S('<path d="M4 4l16 16"/><path d="M9.9 5.9A9.8 9.8 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.2 3.9M6.1 6.6A16.6 16.6 0 002.5 12S6 18.5 12 18.5c1.1 0 2.2-.2 3.1-.5"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>'),
  'sort-asc': S('<path d="M7 4v16"/><path d="M3.5 7.5L7 4l3.5 3.5"/><path d="M13 6h8M13 11h6M13 16h4"/>'),
  'sort-desc': S('<path d="M7 4v16"/><path d="M3.5 16.5L7 20l3.5-3.5"/><path d="M13 6h8M13 11h6M13 16h4"/>'),
  'level-up': S('<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/><path d="M5 21h14"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
  columns: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
  flag: S('<path d="M5 21V4"/><path d="M5 5h12l-2.5 3.5L17 12H5"/>'),
  expand: S('<path d="M9 4H4v5"/><path d="M4 4l6 6"/><path d="M15 20h5v-5"/><path d="M20 20l-6-6"/>'),
  minus: S('<path d="M5 12h14"/>'),
  spinner: S('<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.9 4.9l2.8 2.8"/><path d="M16.3 16.3l2.8 2.8"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.9 19.1l2.8-2.8"/><path d="M16.3 7.7l2.8-2.8"/>'),
  play: F('<path d="M8 5.5v13l11-6.5z"/>'),
}
```

## `src/ui/ITextField.vue`

```vue
<script setup lang="ts">
import { ref, useId } from 'vue'
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    error?: boolean | string
    size?: 'sm' | 'md'
    prefixIcon?: IconName
    clearable?: boolean
    type?: string
    autofocus?: boolean
    ariaLabel?: string
  }>(),
  { modelValue: '', size: 'md', type: 'text' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enter'): void
  (e: 'escape'): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const id = useId()
const inputEl = ref<HTMLInputElement>()

function onInput(ev: Event) {
  emit('update:modelValue', (ev.target as HTMLInputElement).value)
}
function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter') emit('enter')
  if (ev.key === 'Escape') emit('escape')
}
function clear() {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}
defineExpose({ focus: () => inputEl.value?.focus(), select: () => inputEl.value?.select() })
</script>

<template>
  <div
    class="is-field"
    :class="[`is-field--${size}`, { 'is-field--error': !!error, 'is-field--disabled': disabled }]"
  >
    <IIcon v-if="prefixIcon" :name="prefixIcon" :size="14" class="is-field__prefix" />
    <input
      :id="id"
      ref="inputEl"
      class="is-field__input"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel ?? placeholder"
      :aria-invalid="!!error || undefined"
      :autofocus="autofocus || undefined"
      @input="onInput"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button
      v-if="clearable && modelValue && !disabled"
      type="button"
      class="is-field__clear"
      aria-label="清除"
      @click="clear"
    >
      <IIcon name="close" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.is-field {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 10px;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.is-field--md {
  height: 32px;
}
.is-field--sm {
  height: 28px;
  padding: 0 8px;
}
.is-field:focus-within {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
}
.is-field--error,
.is-field--error:focus-within {
  border-color: var(--is-danger);
}
.is-field--error:focus-within {
  box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.18);
}
.is-field--disabled {
  background: var(--is-surface-hover);
  opacity: 0.6;
}
.is-field__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--is-text-sm);
  height: 100%;
}
.is-field--sm .is-field__input {
  font-size: var(--is-text-xs);
}
.is-field__prefix {
  color: var(--is-text-tertiary);
}
.is-field__clear {
  display: inline-flex;
  color: var(--is-text-tertiary);
  border-radius: 50%;
  padding: 2px;
}
.is-field__clear:hover {
  color: var(--is-text);
  background: var(--is-surface-hover);
}
</style>
```

## `src/ui/ISelect.vue`

```vue
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
    /** outline=默认带框；ghost=无框文字下拉（如面板头部图种切换）。 */
    variant?: 'outline' | 'ghost'
    ariaLabel?: string
  }>(),
  { size: 'md', variant: 'outline' },
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
  <div ref="rootEl" class="is-select" :class="[`is-select--${size}`, `is-select--${variant}`, { 'is-select--open': open }]">
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
  height: 28px;
  font-size: var(--is-text-xs);
}
/* ghost：无框文字下拉，仅 hover 浅灰底 */
.is-select--ghost .is-select__trigger {
  border-color: transparent;
  background: transparent;
  padding: 0 6px;
  font-weight: 500;
  width: auto;
}
.is-select--ghost .is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--ghost.is-select--open .is-select__trigger,
.is-select--ghost .is-select__trigger:focus-visible {
  border-color: transparent;
  box-shadow: none;
  background: var(--is-surface-hover);
}
.is-select__trigger:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.is-select--open .is-select__trigger,
.is-select__trigger:focus-visible {
  border-color: var(--is-accent);
  box-shadow: 0 0 0 2px rgba(46, 91, 255, 0.14);
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
```

## `src/ui/IPopover.vue`

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFloatingPanel, type FloatingPlacement } from './floating'
import { useClickOutside, useEscape } from './utils'

export type PopoverPlacement = Extract<
  FloatingPlacement,
  'bottom-start' | 'bottom-end' | 'top-start' | 'right-start'
>

const props = withDefaults(
  defineProps<{
    open: boolean
    placement?: PopoverPlacement
    /** 显示小箭头。 */
    arrow?: boolean
    /** 点击外部是否关闭。 */
    closeOnOutside?: boolean
    panelClass?: string
  }>(),
  { placement: 'bottom-start', arrow: true, closeOnOutside: true },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const rootEl = ref<HTMLElement>()
const panelEl = ref<HTMLElement>()
const openRef = computed(() => props.open)
const placementRef = computed(() => props.placement)

const { style: panelStyle } = useFloatingPanel(openRef, rootEl, panelEl, placementRef, {
  zIndex: 'var(--is-z-popover)',
  minWidth: 160,
})

function close() {
  emit('update:open', false)
}

useClickOutside([rootEl, panelEl], (e) => {
  if (!props.closeOnOutside || !props.open) return
  // Nested teleported selects/tooltips live outside panelEl; keep popover open while they are used.
  const target = e.target as HTMLElement | null
  if (target?.closest?.('[data-is-floating="1"]') && panelEl.value?.querySelector('.is-select--open')) {
    return
  }
  close()
})
useEscape(close, () => props.open)

defineExpose({ close })
</script>

<template>
  <div ref="rootEl" class="is-popover">
    <div class="is-popover__anchor" @click.stop>
      <slot name="anchor" :open="open" :close="close" />
    </div>
    <Teleport to="body">
      <Transition name="is-popover-panel">
        <div
          v-if="open"
          ref="panelEl"
          class="is-popover__panel"
          :class="[`is-popover__panel--${placement}`, panelClass]"
          :style="panelStyle"
          data-is-floating="1"
          role="dialog"
          @click.stop
        >
          <span v-if="arrow" class="is-popover__arrow" aria-hidden="true" />
          <slot :close="close" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.is-popover {
  position: relative;
  display: inline-block;
}
.is-popover__panel {
  /* position/top/left come from teleported fixed style */
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  min-width: 160px;
}
.is-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  transform: rotate(45deg);
}
.is-popover__panel--bottom-start .is-popover__arrow,
.is-popover__panel--bottom-end .is-popover__arrow {
  top: -6px;
  border-right: none;
  border-bottom: none;
}
.is-popover__panel--bottom-start .is-popover__arrow {
  left: 14px;
}
.is-popover__panel--bottom-end .is-popover__arrow {
  right: 14px;
}
.is-popover__panel--top-start .is-popover__arrow {
  bottom: -6px;
  left: 14px;
  border-left: none;
  border-top: none;
}
.is-popover__panel--right-start .is-popover__arrow {
  left: -6px;
  top: 12px;
  border-right: none;
  border-top: none;
}

.is-popover-panel-enter-active,
.is-popover-panel-leave-active {
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    transform var(--is-dur-fast) var(--is-ease);
}
.is-popover-panel-enter-from,
.is-popover-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.is-popover__panel--top-start.is-popover-panel-enter-from,
.is-popover__panel--top-start.is-popover-panel-leave-to {
  transform: translateY(4px);
}
</style>
```

## `src/ui/IModal.vue`

```vue
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import IIcon from './IIcon.vue'
import { FOCUSABLE_SELECTOR } from './utils'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** center = 居中弹窗；drawer = 右侧抽屉。 */
    variant?: 'center' | 'drawer'
    width?: number
    /** 点击遮罩关闭。 */
    closeOnOverlay?: boolean
  }>(),
  { variant: 'center', width: 480, closeOnOverlay: true },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'closed'): void }>()

const panelEl = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

function close() {
  emit('update:open', false)
  emit('closed')
}

function onOverlayClick() {
  if (props.closeOnOverlay) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab' || !panelEl.value) return
  // 焦点圈定
  const focusables = Array.from(panelEl.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || !panelEl.value.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      previousFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown, true)
      document.body.style.overflow = 'hidden'
      await nextTick()
      const first = panelEl.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(first ?? panelEl.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      document.body.style.overflow = ''
      previousFocus?.focus?.()
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition :name="variant === 'drawer' ? 'is-drawer' : 'is-modal'">
      <div
        v-if="open"
        class="is-modal__overlay"
        :class="{ 'is-modal__overlay--drawer': variant === 'drawer' }"
        role="presentation"
        @mousedown.self="onOverlayClick"
      >
        <div
          ref="panelEl"
          class="is-modal__panel"
          :class="[`is-modal__panel--${variant}`]"
          :style="variant === 'center' ? { width: `${width}px` } : { width: `${width}px` }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="is-modal__header">
            <slot name="header">
              <h3 class="is-modal__title">{{ title }}</h3>
            </slot>
            <button type="button" class="is-modal__close" aria-label="关闭" @click="close">
              <IIcon name="close" :size="14" />
            </button>
          </header>
          <div class="is-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="is-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.is-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--is-z-modal);
  background: rgba(16, 24, 40, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.is-modal__overlay--drawer {
  justify-content: flex-end;
  padding: 0;
}
.is-modal__panel {
  background: var(--is-surface);
  border-radius: var(--is-radius-lg);
  box-shadow: var(--is-shadow-lg);
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  outline: none;
}
.is-modal__panel--drawer {
  height: 100%;
  border-radius: 0;
}
.is-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--is-border);
}
.is-modal__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.is-modal__close {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.is-modal__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.is-modal__body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.is-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--is-border);
}

/* 居中弹窗过渡 */
.is-modal-enter-active,
.is-modal-leave-active {
  transition: opacity var(--is-dur) var(--is-ease);
}
.is-modal-enter-active .is-modal__panel,
.is-modal-leave-active .is-modal__panel {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.is-modal-enter-from,
.is-modal-leave-to {
  opacity: 0;
}
.is-modal-enter-from .is-modal__panel,
.is-modal-leave-to .is-modal__panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* 抽屉过渡 */
.is-drawer-enter-active,
.is-drawer-leave-active {
  transition: opacity var(--is-dur) var(--is-ease);
}
.is-drawer-enter-active .is-modal__panel,
.is-drawer-leave-active .is-modal__panel {
  transition: transform var(--is-dur-slow) var(--is-ease);
}
.is-drawer-enter-from,
.is-drawer-leave-to {
  opacity: 0;
}
.is-drawer-enter-from .is-modal__panel,
.is-drawer-leave-to .is-modal__panel {
  transform: translateX(40px);
}
</style>
```

## `src/ui/ITabs.vue`

```vue
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

export interface TabItem {
  key: string
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  tabs: TabItem[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const tabEls = ref<HTMLElement[]>([])
const indicator = ref<{ left: number; width: number }>({ left: 0, width: 0 })

function select(key: string) {
  const tab = props.tabs.find((t) => t.key === key)
  if (!tab || tab.disabled) return
  emit('update:modelValue', key)
}

async function updateIndicator() {
  await nextTick()
  const idx = props.tabs.findIndex((t) => t.key === props.modelValue)
  const el = tabEls.value?.[idx]
  if (el) indicator.value = { left: el.offsetLeft, width: el.offsetWidth }
}

function onKeydown(e: KeyboardEvent, idx: number) {
  let next = -1
  if (e.key === 'ArrowRight') next = (idx + 1) % props.tabs.length
  else if (e.key === 'ArrowLeft') next = (idx - 1 + props.tabs.length) % props.tabs.length
  if (next >= 0) {
    e.preventDefault()
    tabEls.value[next]?.focus()
    select(props.tabs[next].key)
  }
}

onMounted(updateIndicator)
watch(() => [props.modelValue, props.tabs], updateIndicator, { deep: true })
</script>

<template>
  <div class="is-tabs" role="tablist">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.key"
      ref="tabEls"
      type="button"
      class="is-tabs__tab"
      :class="{ 'is-tabs__tab--active': tab.key === modelValue }"
      role="tab"
      :aria-selected="tab.key === modelValue"
      :tabindex="tab.key === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      @click="select(tab.key)"
      @keydown="onKeydown($event, i)"
    >
      {{ tab.label }}
    </button>
    <span
      class="is-tabs__indicator"
      :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.is-tabs {
  position: relative;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--is-border);
}
.is-tabs__tab {
  padding: 8px 12px;
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text-secondary);
  border-radius: var(--is-radius-sm) var(--is-radius-sm) 0 0;
  transition: color var(--is-dur-fast) var(--is-ease);
}
.is-tabs__tab:hover:not(:disabled) {
  color: var(--is-text);
}
.is-tabs__tab--active {
  color: var(--is-accent);
}
.is-tabs__tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.is-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--is-accent);
  border-radius: 2px;
  transition:
    transform var(--is-dur) var(--is-ease),
    width var(--is-dur) var(--is-ease);
}
</style>
```

## `src/ui/ITooltip.vue`

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useFloatingPanel } from './floating'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom'
    /** 悬停延迟（ms）。 */
    delay?: number
  }>(),
  { placement: 'top', delay: 300 },
)

const rootEl = ref<HTMLElement>()
const bubbleEl = ref<HTMLElement>()
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const { style: bubbleStyle } = useFloatingPanel(
  visible,
  rootEl,
  bubbleEl,
  computed(() => props.placement),
  { zIndex: 'var(--is-z-popover)' },
)

function show() {
  clearTimeout(timer)
  timer = setTimeout(() => (visible.value = true), props.delay)
}
function hide() {
  clearTimeout(timer)
  visible.value = false
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span
    ref="rootEl"
    class="is-tooltip"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Teleport to="body">
      <Transition name="is-tooltip-fade">
        <span
          v-if="visible && content"
          ref="bubbleEl"
          class="is-tooltip__bubble"
          :class="`is-tooltip__bubble--${placement}`"
          :style="bubbleStyle"
          data-is-floating="1"
          role="tooltip"
          >{{ content }}</span
        >
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.is-tooltip {
  position: relative;
  display: inline-flex;
}
.is-tooltip__bubble {
  /* position/top/left from teleported fixed style */
  background: #1d2939;
  color: #fff;
  font-size: var(--is-text-xs);
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: var(--is-radius-sm);
  white-space: nowrap;
  max-width: 260px;
  pointer-events: none;
  box-shadow: var(--is-shadow-md);
}
.is-tooltip-fade-enter-active,
.is-tooltip-fade-leave-active {
  transition: opacity var(--is-dur-fast) var(--is-ease);
}
.is-tooltip-fade-enter-from,
.is-tooltip-fade-leave-to {
  opacity: 0;
}
</style>
```

## `src/ui/IToggle.vue`

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
  }>(),
  {},
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label class="is-toggle" :class="{ 'is-toggle--disabled': disabled }">
    <button
      type="button"
      class="is-toggle__track"
      :class="{ 'is-toggle__track--on': modelValue }"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="is-toggle__thumb" />
    </button>
    <span v-if="label || $slots.default" class="is-toggle__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.is-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.is-toggle--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.is-toggle__track {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: var(--is-radius-full);
  background: var(--is-border-strong);
  transition: background-color var(--is-dur-fast) var(--is-ease);
  flex-shrink: 0;
}
.is-toggle__track--on {
  background: var(--is-accent);
}
.is-toggle__track:focus-visible {
  box-shadow: var(--is-ring);
}
.is-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--is-shadow-sm);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-toggle__track--on .is-toggle__thumb {
  transform: translateX(14px);
}
.is-toggle__label {
  font-size: var(--is-text-sm);
}
</style>
```

## `src/ui/ISlider.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    /** 是否在尾部显示当前值。 */
    showValue?: boolean
    format?: (v: number) => string
    ariaLabel?: string
  }>(),
  { min: 0, max: 100, step: 1, showValue: true },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const pct = computed(() => ((props.modelValue - props.min) / (props.max - props.min || 1)) * 100)

function onInput(e: Event) {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="is-slider" :class="{ 'is-slider--disabled': disabled }">
    <input
      type="range"
      class="is-slider__input"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :style="{ '--is-slider-pct': `${pct}%` }"
      @input="onInput"
    />
    <span v-if="showValue" class="is-slider__value">{{ format ? format(modelValue) : modelValue }}</span>
  </div>
</template>

<style scoped>
.is-slider {
  display: flex;
  align-items: center;
  gap: 10px;
}
.is-slider--disabled {
  opacity: 0.5;
}
.is-slider__input {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--is-accent) var(--is-slider-pct, 0%),
    var(--is-border-strong) var(--is-slider-pct, 0%)
  );
  outline: none;
  cursor: pointer;
}
.is-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--is-accent);
  box-shadow: var(--is-shadow-sm);
  transition: transform var(--is-dur-fast) var(--is-ease);
}
.is-slider__input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.is-slider__input::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--is-accent);
}
.is-slider__input:focus-visible {
  box-shadow: var(--is-ring);
}
.is-slider__value {
  min-width: 32px;
  text-align: right;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
```

## `src/ui/IColorSwatch.vue`

```vue
<script setup lang="ts">
import IIcon from './IIcon.vue'

const props = withDefaults(
  defineProps<{
    color: string
    selected?: boolean
    size?: number
    title?: string
  }>(),
  { size: 20 },
)

const emit = defineEmits<{ (e: 'select', color: string): void }>()
</script>

<template>
  <button
    type="button"
    class="is-swatch"
    :class="{ 'is-swatch--selected': selected }"
    :style="{ background: color, width: `${size}px`, height: `${size}px` }"
    :aria-pressed="selected"
    :title="title ?? color"
    :aria-label="`颜色 ${color}`"
    @click="emit('select', color)"
  >
    <IIcon v-if="selected" name="check" :size="12" class="is-swatch__check" />
  </button>
</template>

<style scoped>
.is-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--is-radius-sm);
  border: 1px solid rgba(16, 24, 40, 0.12);
  transition:
    transform var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.is-swatch:hover {
  transform: scale(1.12);
}
.is-swatch--selected {
  box-shadow:
    0 0 0 2px var(--is-surface),
    0 0 0 4px var(--is-accent);
}
.is-swatch__check {
  color: #fff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.6));
}
</style>
```

## `src/ui/IColorPicker.vue`

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IColorSwatch from './IColorSwatch.vue'
import { PRESET_COLORS } from './colors'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    presets?: string[]
  }>(),
  { modelValue: '#2e5bff' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const colors = computed(() => props.presets ?? PRESET_COLORS)

const hex = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (hex.value = v),
)

const hexError = ref(false)

function normalizeHex(v: string): string | null {
  const s = v.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s.split('').map((c) => c + c).join('')}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`.toLowerCase()
  return null
}

function applyHex() {
  const v = normalizeHex(hex.value)
  if (v) {
    hexError.value = false
    emit('update:modelValue', v)
  } else {
    hexError.value = true
  }
}
</script>

<template>
  <div class="is-colorpicker">
    <div class="is-colorpicker__grid" role="listbox" aria-label="预设颜色">
      <IColorSwatch
        v-for="c in colors"
        :key="c"
        :color="c"
        :selected="modelValue?.toLowerCase() === c.toLowerCase()"
        @select="emit('update:modelValue', $event)"
      />
    </div>
    <div class="is-colorpicker__custom">
      <span class="is-colorpicker__preview" :style="{ background: normalizeHex(hex) ?? 'transparent' }" />
      <input
        v-model="hex"
        class="is-colorpicker__hex"
        :class="{ 'is-colorpicker__hex--error': hexError }"
        type="text"
        placeholder="#2e5bff"
        aria-label="自定义颜色 hex"
        spellcheck="false"
        @keydown.enter.prevent="applyHex"
        @blur="applyHex"
      />
    </div>
  </div>
</template>

<style scoped>
.is-colorpicker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.is-colorpicker__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}
.is-colorpicker__custom {
  display: flex;
  align-items: center;
  gap: 8px;
}
.is-colorpicker__preview {
  width: 24px;
  height: 24px;
  border-radius: var(--is-radius-sm);
  border: 1px solid var(--is-border-strong);
  flex-shrink: 0;
}
.is-colorpicker__hex {
  flex: 1;
  height: 28px;
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  padding: 0 8px;
  font-family: var(--is-font-mono);
  font-size: var(--is-text-xs);
  outline: none;
  transition: border-color var(--is-dur-fast) var(--is-ease);
}
.is-colorpicker__hex:focus {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring);
}
.is-colorpicker__hex--error {
  border-color: var(--is-danger);
}
</style>
```

## `src/ui/colors.ts`

```ts
/** 预设色板（Benchling 风格科学图表配色）。 */
export const PRESET_COLORS = [
  '#2e5bff',
  '#1f9d66',
  '#f79009',
  '#d92d20',
  '#7a5af8',
  '#06aed4',
  '#e31c79',
  '#667085',
  '#1e2a78',
  '#84cc16',
  '#f04452',
  '#0e9384',
  '#b54708',
  '#4e5ba6',
  '#98a2b3',
  '#1d2939',
]
```

## `src/ui/IFieldCapsule.vue`

```vue
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
      <IIcon name="sliders" :size="12" />
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
```

## `src/ui/IEmptyState.vue`

```vue
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

/** 空态：插画位 + 标题 + 描述 + CTA。 */
withDefaults(
  defineProps<{
    icon?: IconName
    title: string
    description?: string
  }>(),
  { icon: 'database' },
)
</script>

<template>
  <div class="is-empty">
    <div class="is-empty__art" aria-hidden="true">
      <slot name="illustration">
        <IIcon :name="icon" :size="36" />
      </slot>
    </div>
    <h3 class="is-empty__title">{{ title }}</h3>
    <p v-if="description" class="is-empty__desc">{{ description }}</p>
    <div v-if="$slots.default" class="is-empty__cta">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 8px;
}
.is-empty__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--is-accent-soft);
  color: var(--is-accent);
  margin-bottom: 8px;
}
.is-empty__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.is-empty__desc {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  max-width: 360px;
}
.is-empty__cta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
```

## `src/ui/IBadge.vue`

```vue
<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'yellow' | 'red'

/** 过滤/转换 chip 与小徽标。 */
withDefaults(
  defineProps<{
    tone?: BadgeTone
    icon?: IconName
    removable?: boolean
    clickable?: boolean
  }>(),
  { tone: 'gray' },
)

const emit = defineEmits<{ (e: 'remove'): void; (e: 'click'): void }>()
</script>

<template>
  <span
    class="is-badge"
    :class="[`is-badge--${tone}`, { 'is-badge--clickable': clickable }]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('click')"
    @keydown.enter="clickable && emit('click')"
  >
    <IIcon v-if="icon" :name="icon" :size="12" />
    <span class="is-ellipsis"><slot /></span>
    <button
      v-if="removable"
      type="button"
      class="is-badge__remove"
      aria-label="移除"
      @click.stop="emit('remove')"
    >
      <IIcon name="close" :size="10" />
    </button>
  </span>
</template>

<style scoped>
.is-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  font-size: var(--is-text-xs);
  font-weight: 500;
  border: 1px solid transparent;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.is-badge--gray {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  border-color: var(--is-border);
}
.is-badge--blue {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  border-color: #d3dfff;
}
.is-badge--green {
  background: var(--is-success-soft);
  color: var(--is-success);
  border-color: #cdeede;
}
.is-badge--yellow {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  border-color: #f3e3b3;
}
.is-badge--red {
  background: var(--is-danger-soft);
  color: var(--is-danger);
  border-color: #f6d2ce;
}
.is-badge--clickable {
  cursor: pointer;
}
.is-badge--clickable:hover {
  filter: brightness(0.96);
}
.is-badge__remove {
  display: inline-flex;
  padding: 1px;
  border-radius: 50%;
  color: inherit;
  opacity: 0.7;
}
.is-badge__remove:hover {
  opacity: 1;
  background: rgba(16, 24, 40, 0.1);
}
</style>
```

## `src/ui/ISplitPane.vue`

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * 可拖拽分隔条的双栏面板。
 * direction: horizontal = 左右分栏（默认）；vertical = 上下分栏。
 * ratio = 第一栏占比 (0~1)；最小尺寸约束（px）；双击分隔条复位；storageKey 记住比例。
 */
const props = withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical'
    ratio?: number
    defaultRatio?: number
    /** 第一栏最小尺寸 px。 */
    minFirst?: number
    /** 第二栏最小尺寸 px。 */
    minSecond?: number
    storageKey?: string
    disabled?: boolean
  }>(),
  { direction: 'horizontal', defaultRatio: 0.5, minFirst: 120, minSecond: 120 },
)

const emit = defineEmits<{ (e: 'update:ratio', v: number): void }>()

const containerEl = ref<HTMLElement>()
const dragging = ref(false)

const innerRatio = ref(props.ratio ?? readStored() ?? props.defaultRatio)

function readStored(): number | null {
  if (!props.storageKey) return null
  try {
    const raw = localStorage.getItem(`is-splitpane:${props.storageKey}`)
    if (raw === null) return null
    const v = Number(raw)
    return Number.isFinite(v) && v > 0 && v < 1 ? v : null
  } catch {
    return null
  }
}

const currentRatio = computed(() => props.ratio ?? innerRatio.value)

function setRatio(v: number) {
  const clamped = Math.min(0.95, Math.max(0.05, v))
  if (props.ratio === undefined) innerRatio.value = clamped
  emit('update:ratio', clamped)
  if (props.storageKey) {
    try {
      localStorage.setItem(`is-splitpane:${props.storageKey}`, String(clamped))
    } catch {
      /* 忽略存储失败 */
    }
  }
}

watch(
  () => props.ratio,
  (v) => {
    if (v !== undefined) innerRatio.value = v
  },
)

function clampByMin(ratio: number): number {
  const el = containerEl.value
  if (!el) return ratio
  const total = props.direction === 'horizontal' ? el.clientWidth : el.clientHeight
  if (total <= 0) return ratio
  const minR = props.minFirst / total
  const maxR = 1 - props.minSecond / total
  return Math.min(maxR, Math.max(minR, ratio))
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return
  dragging.value = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || !containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const ratio =
    props.direction === 'horizontal'
      ? (e.clientX - rect.left) / rect.width
      : (e.clientY - rect.top) / rect.height
  setRatio(clampByMin(ratio))
}

function onPointerUp() {
  dragging.value = false
}

function onDblClick() {
  setRatio(clampByMin(props.defaultRatio))
}

function onKeydown(e: KeyboardEvent) {
  const step = 0.02
  const horizontalKeys = props.direction === 'horizontal'
  if ((horizontalKeys && e.key === 'ArrowLeft') || (!horizontalKeys && e.key === 'ArrowUp')) {
    e.preventDefault()
    setRatio(clampByMin(currentRatio.value - step))
  } else if ((horizontalKeys && e.key === 'ArrowRight') || (!horizontalKeys && e.key === 'ArrowDown')) {
    e.preventDefault()
    setRatio(clampByMin(currentRatio.value + step))
  }
}

onBeforeUnmount(() => {
  dragging.value = false
})
</script>

<template>
  <div
    ref="containerEl"
    class="is-split"
    :class="[`is-split--${direction}`, { 'is-split--dragging': dragging }]"
  >
    <div class="is-split__pane is-split__first" :style="{ flexBasis: `${currentRatio * 100}%` }">
      <slot name="first" />
    </div>
    <div
      class="is-split__divider"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(currentRatio * 100)"
      tabindex="0"
      title="拖拽调整，双击复位"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @dblclick="onDblClick"
      @keydown="onKeydown"
    >
      <span class="is-split__handle" />
    </div>
    <div class="is-split__pane is-split__second">
      <slot name="second" />
    </div>
  </div>
</template>

<style scoped>
.is-split {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.is-split--horizontal {
  flex-direction: row;
}
.is-split--vertical {
  flex-direction: column;
}
.is-split__pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.is-split--horizontal .is-split__first {
  flex-shrink: 0;
}
.is-split--vertical .is-split__first {
  flex-shrink: 0;
}
.is-split__second {
  flex: 1;
}
.is-split__divider {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-border);
  transition: background-color var(--is-dur-fast) var(--is-ease);
  touch-action: none;
}
.is-split--horizontal .is-split__divider {
  width: 5px;
  cursor: col-resize;
}
.is-split--vertical .is-split__divider {
  height: 5px;
  cursor: row-resize;
}
.is-split__divider:hover,
.is-split--dragging .is-split__divider,
.is-split__divider:focus-visible {
  background: var(--is-accent);
}
.is-split--dragging {
  user-select: none;
}
.is-split__handle {
  border-radius: 2px;
  background: var(--is-text-tertiary);
}
.is-split--horizontal .is-split__handle {
  width: 3px;
  height: 24px;
}
.is-split--vertical .is-split__handle {
  width: 24px;
  height: 3px;
}
.is-split__divider:hover .is-split__handle,
.is-split--dragging .is-split__handle {
  background: #fff;
}
</style>
```

## `src/ui/toast.ts`

```ts
import { reactive } from 'vue'
import { uuid } from '../shared/id'

export type ToastKind = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  title?: string
  duration: number
  /** 同消息合并次数（≥2 时 UI 显示 ×N）。 */
  count: number
}

/** 全局 toast 单例状态（由 <ToastHost/> 渲染）。 */
const items = reactive<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function dismiss(id: string): void {
  const idx = items.findIndex((t) => t.id === id)
  if (idx >= 0) items.splice(idx, 1)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function push(kind: ToastKind, message: string, opts: { title?: string; duration?: number } = {}): string {
  const duration = opts.duration ?? (kind === 'error' ? 6000 : 3500)
  // 同 kind+message+title 的在场 toast 合并：计数 +1 并刷新计时，避免连击叠加爆炸
  const existing = items.find((t) => t.kind === kind && t.message === message && t.title === opts.title)
  if (existing) {
    existing.count += 1
    if (duration > 0) {
      const timer = timers.get(existing.id)
      if (timer) clearTimeout(timer)
      timers.set(existing.id, setTimeout(() => dismiss(existing.id), duration))
    }
    return existing.id
  }
  const id = uuid()
  items.push({ id, kind, message, title: opts.title, duration, count: 1 })
  if (duration > 0) timers.set(id, setTimeout(() => dismiss(id), duration))
  return id
}

/** 全局 toast service。 */
export const toast = {
  success: (message: string, opts?: { title?: string; duration?: number }) => push('success', message, opts),
  warning: (message: string, opts?: { title?: string; duration?: number }) => push('warning', message, opts),
  error: (message: string, opts?: { title?: string; duration?: number }) => push('error', message, opts),
  info: (message: string, opts?: { title?: string; duration?: number }) => push('info', message, opts),
  dismiss,
}

/** 供 ToastHost 读取当前 toast 列表。 */
export function useToastItems(): ToastItem[] {
  return items
}
```

## `src/ui/ToastHost.vue`

```vue
<script setup lang="ts">
import IIcon from './IIcon.vue'
import { toast, useToastItems, type ToastKind } from './toast'
import type { IconName } from './icons'

const items = useToastItems()

const KIND_ICON: Record<ToastKind, IconName> = {
  success: 'check',
  warning: 'warning',
  error: 'close',
  info: 'info',
}
</script>

<template>
  <div class="is-toast-host" role="region" aria-label="通知" aria-live="polite">
    <TransitionGroup name="is-toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="is-toast"
        :class="`is-toast--${item.kind}`"
        role="status"
      >
        <span class="is-toast__icon" aria-hidden="true">
          <IIcon :name="KIND_ICON[item.kind]" :size="13" />
        </span>
        <div class="is-toast__content">
          <div v-if="item.title" class="is-toast__title">{{ item.title }}</div>
          <div class="is-toast__message">
            {{ item.message }}<span v-if="item.count > 1" class="is-toast__count">×{{ item.count }}</span>
          </div>
        </div>
        <button type="button" class="is-toast__close" aria-label="关闭通知" @click="toast.dismiss(item.id)">
          <IIcon name="close" :size="12" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.is-toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: var(--is-z-toast);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 340px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}
.is-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.is-toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
}
.is-toast--success .is-toast__icon {
  background: var(--is-success);
}
.is-toast--warning .is-toast__icon {
  background: #e6a817;
}
.is-toast--error .is-toast__icon {
  background: var(--is-danger);
}
.is-toast--info .is-toast__icon {
  background: var(--is-info);
}
.is-toast__content {
  flex: 1;
  min-width: 0;
}
.is-toast__title {
  font-size: var(--is-text-sm);
  font-weight: 600;
}
.is-toast__message {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  word-break: break-word;
}
.is-toast__count {
  margin-left: 6px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-tertiary);
}
.is-toast__close {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.is-toast__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.is-toast-enter-active,
.is-toast-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.is-toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.is-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.is-toast-move {
  transition: transform var(--is-dur) var(--is-ease);
}
</style>
```

## `src/ui/floating.ts`

```ts
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type FloatingPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'right-start' | 'top' | 'bottom'

export interface FloatingStyle {
  position: 'fixed'
  top: string
  left: string
  minWidth?: string
  maxWidth?: string
  transform?: string
  zIndex: string | number
}

const GAP = 8

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Anchor rect → fixed panel style; keeps panel inside the viewport. */
export function computeFloatingStyle(
  anchor: DOMRect,
  panel: { width: number; height: number },
  placement: FloatingPlacement,
  opts: { minWidth?: number; zIndex?: string | number; matchAnchorWidth?: boolean } = {},
): FloatingStyle {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const zIndex = opts.zIndex ?? 'var(--is-z-popover)'
  let top = 0
  let left = 0
  let transform: string | undefined

  const width = opts.matchAnchorWidth ? Math.max(opts.minWidth ?? 0, anchor.width) : panel.width || opts.minWidth || 160
  const height = panel.height || 40

  switch (placement) {
    case 'bottom-start':
      top = anchor.bottom + GAP
      left = anchor.left
      break
    case 'bottom-end':
      top = anchor.bottom + GAP
      left = anchor.right - width
      break
    case 'top-start':
      top = anchor.top - GAP - height
      left = anchor.left
      break
    case 'right-start':
      top = anchor.top
      left = anchor.right + GAP
      break
    case 'top':
      top = anchor.top - GAP - height
      left = anchor.left + anchor.width / 2
      transform = 'translateX(-50%)'
      break
    case 'bottom':
      top = anchor.bottom + GAP
      left = anchor.left + anchor.width / 2
      transform = 'translateX(-50%)'
      break
  }

  // Flip vertically if overflowing viewport
  if ((placement === 'bottom-start' || placement === 'bottom-end' || placement === 'bottom') && top + height > vh - 8) {
    top = Math.max(8, anchor.top - GAP - height)
  }
  if ((placement === 'top-start' || placement === 'top') && top < 8) {
    top = Math.min(vh - height - 8, anchor.bottom + GAP)
  }

  if (!transform) {
    left = clamp(left, 8, Math.max(8, vw - width - 8))
  } else {
    // centered: keep bubble roughly on-screen
    const half = width / 2
    left = clamp(left, 8 + half, Math.max(8 + half, vw - half - 8))
  }
  top = clamp(top, 8, Math.max(8, vh - height - 8))

  const style: FloatingStyle = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    zIndex,
  }
  if (transform) style.transform = transform
  if (opts.matchAnchorWidth) style.minWidth = `${Math.round(Math.max(anchor.width, opts.minWidth ?? 0))}px`
  else if (opts.minWidth) style.minWidth = `${opts.minWidth}px`
  return style
}

/** Keep a teleported floating panel aligned to an anchor while open. */
export function useFloatingPanel(
  open: Ref<boolean> | (() => boolean),
  anchorEl: Ref<HTMLElement | undefined>,
  panelEl: Ref<HTMLElement | undefined>,
  placement: Ref<FloatingPlacement> | (() => FloatingPlacement),
  opts: {
    matchAnchorWidth?: boolean
    minWidth?: number
    zIndex?: string | number
  } = {},
) {
  const style = ref<FloatingStyle>({
    position: 'fixed',
    top: '0px',
    left: '0px',
    zIndex: opts.zIndex ?? 'var(--is-z-popover)',
  })

  const isOpen = () => (typeof open === 'function' ? open() : open.value)
  const getPlacement = () => (typeof placement === 'function' ? placement() : placement.value)

  function update() {
    if (!isOpen()) return
    const anchor = anchorEl.value?.getBoundingClientRect()
    if (!anchor) return
    const panel = panelEl.value?.getBoundingClientRect()
    style.value = computeFloatingStyle(
      anchor,
      { width: panel?.width ?? 0, height: panel?.height ?? 0 },
      getPlacement(),
      {
        matchAnchorWidth: opts.matchAnchorWidth,
        minWidth: opts.minWidth,
        zIndex: opts.zIndex,
      },
    )
  }

  let raf = 0
  function schedule() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      update()
      // second pass after panel paints its real size
      nextTick(update)
    })
  }

  function onScrollOrResize() {
    if (isOpen()) schedule()
  }

  onMounted(() => {
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    // capture scroll from any scrollable ancestor
    document.addEventListener('scroll', onScrollOrResize, true)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onScrollOrResize)
    document.removeEventListener('scroll', onScrollOrResize, true)
  })

  watch(
    () => isOpen(),
    (v) => {
      if (v) schedule()
    },
    { immediate: true },
  )

  return { style, update: schedule }
}
```

## `src/ui/utils.ts`

```ts
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** 点击元素外部时触发回调（用于 Popover/Select 关闭）。 */
export function useClickOutside(
  targets: Array<Ref<HTMLElement | undefined>>,
  handler: (e: MouseEvent) => void,
): void {
  const listener = (e: MouseEvent) => {
    const el = e.target as Node
    for (const t of targets) {
      if (t.value && t.value.contains(el)) return
    }
    handler(e)
  }
  onMounted(() => document.addEventListener('mousedown', listener, true))
  onBeforeUnmount(() => document.removeEventListener('mousedown', listener, true))
}

/** 全局 Esc 监听。 */
export function useEscape(handler: () => void, active: () => boolean = () => true): void {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && active()) {
      e.stopPropagation()
      handler()
    }
  }
  onMounted(() => document.addEventListener('keydown', listener, true))
  onBeforeUnmount(() => document.removeEventListener('keydown', listener, true))
}

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
```
