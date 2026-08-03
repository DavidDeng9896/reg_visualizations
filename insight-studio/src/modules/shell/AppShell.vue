<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '../../stores/dashboardStore'
import { ensureProjectDemoSeed } from '../../shared/ensureProjectDemoSeed'
import AppHeader from './AppHeader.vue'
import ShellNav from './ShellNav.vue'
import ShellSidebar from './ShellSidebar.vue'

/**
 * 应用壳层：全局 head（明度风格，占位）+ 一级菜单 rail + 二级侧栏 + 内容区。
 * 二级侧栏按路由切换：看板列表 / 分析列表 / 分析数据流节点树。
 * 首次空库时静默写入项目示例分析（无 toast / 不跳转）。
 */
const dashStore = useDashboardStore()
const { sortedItems } = storeToRefs(dashStore)

onMounted(() => {
  if (!sortedItems.value.length) void dashStore.loadList()
  void ensureProjectDemoSeed().catch((e) => {
    console.error('[AppShell] ensureProjectDemoSeed failed', e)
  })
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-shell__body">
      <ShellNav />
      <ShellSidebar />
      <div class="app-shell__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.app-shell__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.app-shell__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
