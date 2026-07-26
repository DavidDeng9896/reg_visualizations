<script setup lang="ts">
import { IIcon } from '../../ui'

/**
 * Add data 菜单内容（顶栏 Add data 与侧栏「+」共用）。
 * 纯展示组件：点击后由父级决定打开哪个对话框。
 */
const emit = defineEmits<{
  (e: 'import-csv'): void
  (e: 'combine'): void
}>()
</script>

<template>
  <div class="menu menu--adddata" role="menu">
    <button type="button" class="menu__item" role="menuitem" @click="emit('import-csv')">
      <IIcon name="upload" :size="14" />
      <span>
        <span class="menu__item-title">Import CSV</span>
        <span class="menu__item-desc">上传 .csv 文件创建新表</span>
      </span>
    </button>
    <button type="button" class="menu__item" role="menuitem" @click="emit('combine')">
      <IIcon name="combine" :size="14" />
      <span>
        <span class="menu__item-title">Combine tables</span>
        <span class="menu__item-desc">Join / Append 现有表</span>
      </span>
    </button>
    <div class="menu__sep" role="separator" />
    <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
      <IIcon name="database" :size="14" />
      <span>
        <span class="menu__item-title">From Registry</span>
        <span class="menu__item-desc">后续版本</span>
      </span>
    </button>
    <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
      <IIcon name="plate" :size="14" />
      <span>
        <span class="menu__item-title">From Plate</span>
        <span class="menu__item-desc">后续版本</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
}
.menu--adddata {
  width: 260px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.menu__item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.menu__item:disabled {
  color: var(--is-text-tertiary);
  cursor: not-allowed;
}
.menu__item-title {
  display: block;
  font-weight: 500;
}
.menu__item-desc {
  display: block;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.menu__sep {
  height: 1px;
  background: var(--is-border);
  margin: 4px 6px;
}
</style>
