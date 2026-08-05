<script setup lang="ts">
import { ToastHost } from '../ui'
import AppShell from '../modules/shell/AppShell.vue'
import AiDrawer from '../modules/ai/AiDrawer.vue'
import AiFab from '../modules/ai/AiFab.vue'
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <AiDrawer />
  <AiFab />
  <ToastHost />
</template>
