<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const icon = computed(() => ICONS[props.name])
</script>

<template>
  <component
    :is="icon"
    class="is-icon"
    :size="size"
    :stroke-width="1.5"
    aria-hidden="true"
    focusable="false"
  />
</template>

<style scoped>
.is-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
