<script setup lang="ts">
import IIcon from './IIcon.vue'
import type { IconName } from './icons'

/** 空态：插画位 + 标题 + 描述 + CTA。 */
withDefaults(
  defineProps<{
    icon?: IconName
    title: string
    description?: string
  }>(),
  { icon: 'database' },
)
</script>

<template>
  <div class="is-empty">
    <div class="is-empty__art" aria-hidden="true">
      <slot name="illustration">
        <IIcon :name="icon" :size="36" />
      </slot>
    </div>
    <h3 class="is-empty__title">{{ title }}</h3>
    <p v-if="description" class="is-empty__desc">{{ description }}</p>
    <div v-if="$slots.default" class="is-empty__cta">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 8px;
}
.is-empty__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--is-accent-soft);
  color: var(--is-accent);
  margin-bottom: 8px;
}
.is-empty__title {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.is-empty__desc {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  max-width: 360px;
}
.is-empty__cta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
