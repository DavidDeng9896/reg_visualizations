<script setup lang="ts">
import { ToastHost } from '../ui'
import AppShell from '../modules/shell/AppShell.vue'
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <ToastHost />
</template>
