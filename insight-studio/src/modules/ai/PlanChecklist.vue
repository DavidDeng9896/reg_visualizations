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
        <span v-if="nextIndex(i) === 'done'" class="plan__circle plan__circle--done"><IIcon name="check" :size="10" /></span>
        <IIcon v-else-if="nextIndex(i) === 'doing'" name="spinner" :size="12" class="plan__spin" />
        <span v-else class="plan__circle" />
      </span>
      <span class="plan__text">{{ s }}</span>
    </div>
  </div>
</template>

<style scoped>
.plan {
  margin: 4px 0;
  padding: 2px 0;
}
.plan__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
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
.plan__circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--is-border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.plan__circle--done {
  background: var(--is-success);
  border-color: var(--is-success);
  color: #fff;
}
.plan__step--doing .plan__icon {
  color: var(--is-accent);
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
