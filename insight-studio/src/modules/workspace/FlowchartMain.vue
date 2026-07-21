<script setup lang="ts">
import FlowchartCanvas from '../flowchart/FlowchartCanvas.vue'

/**
 * 流程图模式主区：挂载 @vue-flow/core 画布（src/modules/flowchart）。
 * KeepAlive 下组件实例保留，缩放/平移状态不丢。
 */
const emit = defineEmits<{ (e: 'add-data'): void }>()
</script>

<template>
  <div class="flowchart-main" data-mount="flowchart">
    <FlowchartCanvas @add-data="emit('add-data')" />
  </div>
</template>

<style scoped>
.flowchart-main {
  height: 100%;
  min-height: 0;
}
</style>
