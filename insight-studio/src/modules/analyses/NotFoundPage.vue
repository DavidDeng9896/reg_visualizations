<script setup lang="ts">
import { IButton, IEmptyState } from '../../ui'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <IEmptyState icon="warning" title="页面不存在" description="你访问的地址没有对应的内容。">
      <IButton variant="primary" @click="router.replace('/')">返回 Analysis 列表</IButton>
    </IEmptyState>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
