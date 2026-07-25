
=== FILE: src/styles/tokens.css (from line 1) ===
```
/* Insight Studio — 设计令牌（DESIGN.md §2 视觉语言） */
:root {
  /* 颜色 */
  --is-primary: #1e2a78;
  --is-primary-hover: #27359a;
  --is-primary-active: #182160;
  --is-accent: #2e5bff;
  --is-accent-hover: #1f49e0;
  --is-accent-soft: #eef2ff;
  --is-success: #1f9d66;
  --is-success-soft: #eefaf3;
  --is-danger: #d92d20;
  --is-danger-hover: #b42318;
  --is-danger-soft: #fef3f2;
  --is-warning-bg: #fdf3d7;
  --is-warning-text: #8a6d1a;
  --is-info: #2e5bff;

  --is-bg: #f7f8fa;
  --is-surface: #ffffff;
  --is-surface-hover: #f2f4f7;
  --is-border: #e4e7ec;
  --is-border-strong: #d0d5dd;

  --is-text: #1d2939;
  --is-text-secondary: #667085;
  --is-text-tertiary: #98a2b3;
  --is-text-inverse: #ffffff;

  --is-node-bg: #eefaf3;

  /* 间距 */
  --is-space-1: 4px;
  --is-space-2: 8px;
  --is-space-3: 12px;
  --is-space-4: 16px;
  --is-space-5: 20px;
  --is-space-6: 24px;
  --is-space-8: 32px;
  --is-space-10: 40px;

  /* 圆角 */
  --is-radius-sm: 6px;
  --is-radius: 8px;
  --is-radius-lg: 12px;
  --is-radius-full: 999px;

  /* 阴影 */
  --is-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --is-shadow-md: 0 4px 12px rgba(16, 24, 40, 0.1);
  --is-shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.16);
  --is-ring: 0 0 0 3px rgba(46, 91, 255, 0.22);

  /* 字号 */
  --is-text-xs: 12px;
  --is-text-sm: 13px;
  --is-text-md: 14px;
  --is-text-lg: 16px;

  /* 动效 */
  --is-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --is-dur-fast: 150ms;
  --is-dur: 200ms;
  --is-dur-slow: 250ms;

  /* 层级（teleport 到 body 后仍保持相对顺序；dropdown 高于 popover/modal 以便嵌套） */
  --is-z-popover: 1200;
  --is-z-modal: 1300;
  --is-z-dropdown: 1350;
  --is-z-toast: 1400;

  /* 字体 */
  --is-font:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --is-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
```

=== FILE: src/styles/base.css (from line 1) ===
```
/* reset + 基础排版 + 滚动条美化 */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--is-font);
  font-size: var(--is-text-sm);
  line-height: 1.5;
  color: var(--is-text);
  background: var(--is-bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4,
p,
figure {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

a {
  color: var(--is-accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* 键盘焦点环（全局兜底，组件内部可覆盖） */
:focus-visible {
  outline: none;
  box-shadow: var(--is-ring);
  border-radius: var(--is-radius-sm);
}

/* 滚动条美化 */
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background: rgba(16, 24, 40, 0.18);
  border-radius: var(--is-radius-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 24, 40, 0.3);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* 通用文本截断 */
.is-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

=== FILE: src/modules/analyses/AnalysisListPage.vue (from line 119) ===
```
<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h1 class="page__title">Projects</h1>
        <p class="page__subtitle">Insight analyses</p>
      </div>
      <div class="page__actions">
        <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
        <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
      </div>
    </header>

    <main class="page__body">
      <div v-if="loading" class="page__loading">加载中…</div>

      <IEmptyState
        v-else-if="!sorted.length"
        icon="folder"
        title="还没有 Analysis"
        description="新建一个空白分析，或从内置 Demo 数据开始探索。"
      >
        <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
        <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
      </IEmptyState>

      <div v-else class="grid">
        <article
          v-for="a in sorted"
          :key="a.id"
          class="card"
          tabindex="0"
          role="link"
          data-testid="analysis-card"
          :data-name="a.name"
          :aria-label="`打开 ${a.name}`"
          @click="router.push(`/analysis/${a.id}`)"
          @keydown.enter="router.push(`/analysis/${a.id}`)"
        >
          <div class="card__top">
            <div class="card__icon"><IIcon name="flowchart" :size="18" /></div>
            <IPopover :open="menuFor === a.id" placement="bottom-end" :arrow="false" @update:open="menuFor = $event ? a.id : null">
              <template #anchor>
                <button
                  type="button"
                  class="card__menu-btn"
                  aria-label="更多操作"
                  @click.stop="toggleMenu(a.id)"
                >
                  <IIcon name="more" :size="15" />
                </button>
              </template>
              <template #default="{ close }">
                <div class="menu" role="menu">
                  <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openRename(a)">
                    <IIcon name="edit" :size="13" /> 重命名
                  </button>
                  <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); openDelete(a)">
                    <IIcon name="trash" :size="13" /> 删除
                  </button>
                </div>
              </template>
            </IPopover>
          </div>
          <h3 class="card__name is-ellipsis" :title="a.name">{{ a.name }}</h3>
          <p class="card__meta">
            {{ a.tables.length }} 张表 · {{ countAnalysisViews(a) }} 个视图
          </p>
          <p class="card__time">更新于 {{ formatRelative(a.updatedAt) }}</p>
        </article>
      </div>
    </main>

    <!-- 新建 -->
    <IModal :open="createOpen" title="新建 Analysis" :width="420" @update:open="createOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="createName" placeholder="例如：Binding assay analysis" autofocus @enter="submitCreate" />
      </label>
      <template #footer>
        <IButton @click="createOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!createName.trim()" :loading="creating" @click="submitCreate">
          创建
        </IButton>
      </template>
    </IModal>

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名" :width="420" @update:open="renameOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="renameName" autofocus @enter="submitRename" />
      </label>
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除 Analysis" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">
        确定删除「{{ deleteTarget?.name }}」吗？其中的所有表、视图与图表配置都会被删除，此操作不可撤销。
      </p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
}
.page__title {
  font-size: var(--is-text-lg);
  font-weight: 600;
}
.page__subtitle {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.page__actions {
  display: flex;
  gap: 8px;
}
.page__body {
  flex: 1;
  padding: 24px 32px;
}
.page__loading {
  color: var(--is-text-secondary);
  padding: 40px 0;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.card {
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-sm);
  padding: 14px 16px;
  cursor: pointer;
  transition:
    box-shadow var(--is-dur) var(--is-ease),
    border-color var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.card:hover,
.card:focus-visible {
  border-color: var(--is-border-strong);
  box-shadow: var(--is-shadow-md);
  transform: translateY(-1px);
}
.card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--is-radius-sm);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.card__menu-btn {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
  opacity: 0;
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.card:hover .card__menu-btn,
.card:focus-within .card__menu-btn {
  opacity: 1;
}
.card__menu-btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.card__name {
  font-size: var(--is-text-md);
  font-weight: 600;
  margin-bottom: 4px;
}
.card__meta {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.card__time {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  margin-top: 10px;
}
.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
```

=== FILE: src/ui/IButton.vue (from line 1) ===
```
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

=== FILE: src/ui/ITextField.vue (from line 1) ===
```
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

=== FILE: src/ui/ISelect.vue (from line 159) ===
```
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

=== FILE: src/ui/IModal.vue (from line 1) ===
```
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

=== FILE: src/ui/IEmptyState.vue (from line 1) ===
```
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

=== FILE: src/ui/IBadge.vue (from line 1) ===
```
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

=== FILE: src/ui/IIcon.vue (from line 1) ===
```
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
