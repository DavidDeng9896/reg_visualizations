<script setup lang="ts">
import { computed } from 'vue'
import { resolveLucide, resolveMspClass, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 14 },
)

const mspClass = computed(() => resolveMspClass(props.name))
const lucide = computed(() => resolveLucide(props.name))
</script>

<template>
  <!-- 优先 iconfont-MSP；无映射时回退 Lucide -->
  <i
    v-if="mspClass"
    class="is-icon is-icon--msp iconfont-MSP"
    :class="mspClass"
    :style="{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px`, lineHeight: `${size}px` }"
    aria-hidden="true"
  />
  <component
    :is="lucide"
    v-else
    class="is-icon is-icon--lucide"
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
.is-icon--msp {
  speak: never;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  text-align: center;
  color: currentColor;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.is-icon--lucide {
  display: inline-block;
}
</style>
