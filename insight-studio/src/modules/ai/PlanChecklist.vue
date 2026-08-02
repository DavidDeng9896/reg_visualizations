<script setup lang="ts">
import { IIcon } from '../../ui'

/** 计划清单：逐项打勾（对齐参考图「进展」）。 */
const props = defineProps<{
  steps: string[]
  done: number[]
  streaming?: boolean
}>()

const nextIndex = (i: number) => (props.done.includes(i) ? 'done' : i === (props.done.length ? Math.max(...props.done) + 1 : 0) ? 'doing' : 'todo')
</script>

<template>
  <div class="plan" data-testid="ai-plan">
    <div class="plan__title">进展</div>
    <div
      v-for="(s, i) in steps"
      :key="i"
      class="plan__step"
      :class="`plan__step--${nextIndex(i)}`"
    >
      <span class="plan__icon">
        <IIcon v-if="nextIndex(i) === 'done'" name="check" :size="12" />
        <IIcon v-else-if="nextIndex(i) === 'doing'" name="spinner" :size="12" class="plan__spin" />
        <span v-else class="plan__dot" />
      </span>
      <span class="plan__text">{{ s }}</span>
    </div>
  </div>
</template>

<style scoped>
.plan {
  margin: 8px 0 4px;
  padding: 10px 12px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
}
.plan__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 8px;
}
.plan__step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.plan__step--doing {
  color: var(--is-text);
}
.plan__step--done {
  color: var(--is-text-secondary);
}
.plan__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}
.plan__step--done .plan__icon {
  color: var(--is-success);
}
.plan__step--doing .plan__icon {
  color: var(--is-accent);
}
.plan__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--is-border-strong);
}
.plan__spin {
  animation: plan-spin 1s linear infinite;
}
@keyframes plan-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
