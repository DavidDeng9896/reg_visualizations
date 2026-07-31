<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '../../stores/dashboardStore'
import AppHeader from './AppHeader.vue'
import ShellNav from './ShellNav.vue'

/**
 * 应用壳层：全局 head（占位）+ 左侧导航（一级菜单 rail + 二级侧栏）+ 内容区。
 * 所有路由页面渲染在内容区；「数据分析」一级菜单激活，二级侧栏展示看板列表。
 */
const router = useRouter()
const dashStore = useDashboardStore()
const { sortedItems, currentId } = storeToRefs(dashStore)

onMounted(() => {
  if (!sortedItems.value.length) void dashStore.loadList()
})

const dashboards = computed(() => sortedItems.value.map((d) => ({ id: d.id, name: d.name })))

function onSelectDashboard(id: string) {
  void router.push(`/dashboards/${id}`)
}
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-shell__body">
      <ShellNav
        :dashboards="dashboards"
        :current-dashboard-id="currentId"
        @select-dashboard="onSelectDashboard"
      />
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
