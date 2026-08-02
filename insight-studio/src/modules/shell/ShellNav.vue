<script setup lang="ts">
import { useRouter } from 'vue-router'
import { toast } from '../../ui'
import RailIcon, { type RailIconName } from './RailIcon.vue'

/**
 * 左侧一级菜单图标 rail（明度风格）。
 * 除「数据分析」外均为占位菜单；激活项固定定位到「数据分析」。
 */

interface RailItem {
  key: string
  label: string
  icon: RailIconName
}

const RAIL_ITEMS: RailItem[] = [
  { key: 'register', label: '注册', icon: 'register' },
  { key: 'compound', label: '化合物', icon: 'compound' },
  { key: 'synthesis', label: '合成路线', icon: 'synthesis' },
  { key: 'ip', label: 'IP路线', icon: 'ip' },
  { key: 'sequence', label: '序列', icon: 'sequence' },
  { key: 'product', label: '产品', icon: 'product' },
  { key: 'analysis', label: '数据分析', icon: 'analysis' },
  { key: 'settings', label: '设置', icon: 'settings' },
]

const ACTIVE_KEY = 'analysis'

const router = useRouter()

function onRail(item: RailItem) {
  if (item.key === ACTIVE_KEY) {
    // 已在数据分析域：回到分析首页
    void router.push('/')
    return
  }
  toast.info(`「${item.label}」为占位菜单，即将上线`, { title: '占位' })
}
</script>

<template>
  <nav class="rail" aria-label="主导航">
    <button
      v-for="item in RAIL_ITEMS"
      :key="item.key"
      type="button"
      class="rail__item"
      :class="{ 'rail__item--on': item.key === ACTIVE_KEY }"
      :aria-pressed="item.key === ACTIVE_KEY"
      :title="item.label"
      @click="onRail(item)"
    >
      <RailIcon :name="item.icon" :size="20" />
      <span class="rail__label">{{ item.label }}</span>
    </button>
    <button
      type="button"
      class="rail__item rail__item--bottom"
      title="审计日志"
      @click="toast.info('「审计日志」为占位菜单，即将上线', { title: '占位' })"
    >
      <RailIcon name="audit" :size="20" />
      <span class="rail__label">审计日志</span>
    </button>
  </nav>
</template>

<style scoped>
.rail {
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 6px 0;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
}
.rail__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 56px;
  padding: 0 2px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--is-text-secondary);
  font-size: 10px;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: inset 0 0 0 0 transparent;
  transition:
    background var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.rail__item:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.rail__item--on,
.rail__item--on:hover {
  background: var(--is-accent-soft);
  color: var(--is-accent-bright);
  font-weight: 500;
  /* 激活项右缘 3px 蓝条（对齐参考图） */
  box-shadow: inset -3px 0 0 0 var(--is-accent-bright);
}
.rail__label {
  white-space: nowrap;
}
.rail__item--bottom {
  margin-top: auto;
}
</style>
