<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDashboardStore } from '../../stores/dashboardStore'

const props = withDefaults(
  defineProps<{
    /** 当前激活段。 */
    active?: 'dashboard' | 'insight'
  }>(),
  {},
)

const route = useRoute()
const router = useRouter()
const dashStore = useDashboardStore()

const active = computed(() => {
  if (props.active) return props.active
  if (route.path.startsWith('/dashboards')) return 'dashboard'
  return 'insight'
})

function goInsight() {
  void router.push('/')
}

function goDashboard() {
  const last = dashStore.lastId()
  void router.push(last ? `/dashboards/${last}` : '/dashboards')
}
</script>

<template>
  <div class="seg" role="tablist" aria-label="首页模式">
    <button
      type="button"
      role="tab"
      class="seg__btn"
      :class="{ 'seg__btn--on': active === 'dashboard' }"
      :aria-selected="active === 'dashboard'"
      @click="goDashboard"
    >
      看板
    </button>
    <button
      type="button"
      role="tab"
      class="seg__btn"
      :class="{ 'seg__btn--on': active === 'insight' }"
      :aria-selected="active === 'insight'"
      @click="goInsight"
    >
      Insight
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: var(--is-radius-md, 8px);
  background: var(--is-surface-muted, #f2f4f7);
  border: 1px solid var(--is-border, #e4e7ec);
}
.seg__btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 14px;
  font: inherit;
  font-size: var(--is-text-sm, 13px);
  font-weight: 500;
  color: var(--is-text-secondary, #475467);
  border-radius: var(--is-radius-sm, 6px);
  cursor: pointer;
  line-height: 1.2;
}
.seg__btn:hover {
  color: var(--is-text, #101828);
}
.seg__btn--on {
  background: var(--is-surface, #fff);
  color: var(--is-text, #101828);
  box-shadow: 0 1px 2px rgb(16 24 40 / 6%);
}
</style>
