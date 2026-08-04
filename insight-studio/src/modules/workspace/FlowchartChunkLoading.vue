<script setup lang="ts">
/** 流程图异步 chunk 加载占位（不用 runtime template，兼容 vue.runtime）。 */
</script>

<template>
  <div class="ws__chunk-loading" role="status">流程图加载中…</div>
</template>

<style scoped>
.ws__chunk-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
}
</style>
