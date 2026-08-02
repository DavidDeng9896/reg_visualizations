<script setup lang="ts">
import { ToastHost } from '../ui'
import AppShell from '../modules/shell/AppShell.vue'
import AiDrawer from '../modules/ai/AiDrawer.vue'
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <AiDrawer />
  <ToastHost />
</template>
