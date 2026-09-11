<script setup lang="ts">
/**
 * 报告主题缩略图：输入条迷你版（~40×30）与报告节点卡片版共用。
 * 视觉对齐 Lumen handoff：克制边框、选中 #2563eb 环，无厚重 AI chrome。
 */
import type { ReportTemplateId } from '../../../shared/types'
import { REPORT_THEME_OPTIONS } from './reportTemplates'

const props = withDefaults(
  defineProps<{
    modelValue: ReportTemplateId
    /** mini = 输入条；cards = 报告节点右侧 */
    variant?: 'mini' | 'cards'
    disabled?: boolean
  }>(),
  { variant: 'mini', disabled: false },
)

const emit = defineEmits<{
  (e: 'update:modelValue', id: ReportTemplateId): void
}>()

function select(id: ReportTemplateId) {
  if (props.disabled) return
  emit('update:modelValue', id)
}
</script>

<template>
  <div
    class="rtt"
    :class="[`rtt--${variant}`, { 'rtt--disabled': disabled }]"
    role="radiogroup"
    :aria-label="variant === 'mini' ? '报告主题' : '报告主题切换'"
    data-testid="report-theme-thumbs"
  >
    <button
      v-for="opt in REPORT_THEME_OPTIONS"
      :key="opt.id"
      type="button"
      class="rtt__btn"
      :class="[
        `rtt__btn--${opt.id}`,
        { 'rtt__btn--on': modelValue === opt.id },
      ]"
      role="radio"
      :aria-checked="modelValue === opt.id"
      :aria-label="opt.label"
      :title="`${opt.label} · ${opt.description}`"
      :disabled="disabled"
      :data-testid="`report-theme-${opt.id}`"
      @click="select(opt.id)"
    >
      <span class="rtt__preview" aria-hidden="true">
        <!-- research: 论文线框 -->
        <span v-if="opt.id === 'research'" class="rtt__wire rtt__wire--research">
          <span class="rtt__line rtt__line--title" />
          <span class="rtt__line" />
          <span class="rtt__line" />
          <span class="rtt__line rtt__line--short" />
        </span>
        <!-- antibody: 顶栏手册 -->
        <span v-else-if="opt.id === 'antibody'" class="rtt__wire rtt__wire--antibody">
          <span class="rtt__bar" />
          <span class="rtt__block" />
          <span class="rtt__line" />
          <span class="rtt__line rtt__line--short" />
        </span>
        <!-- dashboard-review: 2×2 卡片 -->
        <span v-else class="rtt__wire rtt__wire--dash">
          <span class="rtt__cell" />
          <span class="rtt__cell" />
          <span class="rtt__cell" />
          <span class="rtt__cell" />
        </span>
      </span>
      <span v-if="variant === 'cards'" class="rtt__meta">
        <span class="rtt__name">{{ opt.label }}</span>
        <span class="rtt__desc">{{ opt.description }}</span>
      </span>
      <span v-else class="rtt__mini-label">{{ opt.shortLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.rtt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.rtt--cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.rtt--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.rtt__btn {
  appearance: none;
  margin: 0;
  padding: 0;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: #475467;
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.rtt__btn:hover {
  border-color: #98a2b3;
}
.rtt__btn--on {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.28);
}
.rtt__btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* ---- mini (input bar) ~40×30 ---- */
.rtt--mini .rtt__btn {
  width: 40px;
  height: 30px;
  position: relative;
}
.rtt--mini .rtt__preview {
  flex: 1;
  display: flex;
  padding: 4px;
}
.rtt--mini .rtt__mini-label {
  display: none;
}

/* ---- cards (report node) ---- */
.rtt--cards .rtt__btn {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  min-height: 56px;
  width: 100%;
  text-align: left;
}
.rtt--cards .rtt__preview {
  width: 48px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid #e4e7ec;
  background: #f9fafb;
  display: flex;
  padding: 4px;
}
.rtt--cards .rtt__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rtt--cards .rtt__name {
  font-size: 12px;
  font-weight: 600;
  color: #101828;
}
.rtt--cards .rtt__desc {
  font-size: 11px;
  color: #667085;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* wireframes */
.rtt__wire {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  height: 100%;
}
.rtt__line {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: #98a2b3;
  width: 100%;
}
.rtt__line--title {
  height: 3px;
  width: 70%;
  background: #344054;
  margin-bottom: 1px;
}
.rtt__line--short {
  width: 55%;
}
.rtt__wire--antibody .rtt__bar {
  display: block;
  height: 5px;
  border-radius: 1px;
  background: #1e3a5f;
  margin-bottom: 2px;
}
.rtt__wire--antibody .rtt__block {
  display: block;
  height: 6px;
  border-radius: 2px;
  background: #e8eef5;
  border: 1px solid #d0d5dd;
  margin-bottom: 1px;
}
.rtt__wire--dash {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}
.rtt__cell {
  display: block;
  border-radius: 2px;
  background: #fff;
  border: 1px solid #d0d5dd;
  border-top: 2px solid #2563eb;
}
</style>
