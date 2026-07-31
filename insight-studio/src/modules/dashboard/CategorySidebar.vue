<script setup lang="ts">
import { IIcon } from '../../ui'
import { CHART_DEFS } from '../charts/registry'

/**
 * 分类样式侧栏（mingdu 二级分类树）：按文档图4 要求，以内嵌面板形式呈现，
 * 不使用浮窗。包含「表格 / 图表」分组；图表子项来自图种注册表（真实数据源）。
 * 点击仅为占位（分类本身不产出动作），由父级决定后续行为。
 */

const emit = defineEmits<{ (e: 'pick', kind: 'table' | 'chart', chartType?: string): void }>()

function pickTable() {
  emit('pick', 'table')
}
function pickChart(type: string) {
  emit('pick', 'chart', type)
}
</script>

<template>
  <div class="cats">
    <div class="cats__group">
      <div class="cats__group-head">表格</div>
      <button type="button" class="cats__item" @click="pickTable">
        <IIcon name="table" :size="15" class="cats__item-icon" />
        <span class="cats__item-name">数据表</span>
      </button>
    </div>

    <div class="cats__group">
      <div class="cats__group-head">图表</div>
      <button
        v-for="def in CHART_DEFS"
        :key="def.type"
        type="button"
        class="cats__item"
        @click="pickChart(def.type)"
      >
        <IIcon :name="def.icon" :size="15" class="cats__item-icon" />
        <span class="cats__item-name">{{ def.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cats {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cats__group + .cats__group {
  margin-top: 6px;
}
.cats__group-head {
  padding: 6px 8px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text-tertiary);
}
.cats__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.cats__item:hover {
  background: var(--is-surface-hover);
}
.cats__item-icon {
  flex-shrink: 0;
  color: var(--is-text-secondary);
}
.cats__item-name {
  flex: 1;
  min-width: 0;
}
</style>
