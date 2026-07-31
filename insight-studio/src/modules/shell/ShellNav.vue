<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '../../ui'
import { IIcon, IEmptyState, IButton } from '../../ui'
import type { IconName } from '../../ui'

/**
 * 左侧导航（mingdu-rail-nav + mingdu-sidebar-nav）。
 * - 图标 rail：一级菜单，除「数据分析」外均为占位；激活项定位到「数据分析」。
 * - 二级侧栏：按当前激活的一级菜单渲染；「数据分析」展示看板列表，可点击切换看板；
 *   其余一级菜单渲染二级占位列表。
 */

interface RailItem {
  key: string
  label: string
  icon: IconName
}

const RAIL_ITEMS: RailItem[] = [
  { key: 'home', label: '首页', icon: 'folder' },
  { key: 'register', label: '注册', icon: 'database' },
  { key: 'analysis', label: '数据分析', icon: 'bar' },
  { key: 'process', label: '工艺线', icon: 'flowchart' },
  { key: 'product', label: '产品库', icon: 'box' },
  { key: 'settings', label: '基础设置', icon: 'gear' },
]

/** 一级菜单 → 二级占位列表 */
const SUB_PLACEHOLDER: Record<string, { title: string; groups: { name: string; items: string[] }[] }> = {
  home: { title: '首页', groups: [{ name: '常用', items: ['我的工作台', '最近访问'] }] },
  register: {
    title: '科学数据注册',
    groups: [
      { name: '自定义', items: ['Antigen Protein', 'Antibody Complex', 'Antibody Purifured', 'Cell'] },
      { name: 'DNA', items: ['DNA', 'Plasmid'] },
      { name: 'RNA', items: ['mRNA'] },
    ],
  },
  process: { title: '工艺线', groups: [{ name: '工艺', items: ['上游工艺', '下游纯化'] }] },
  product: { title: '产品库', groups: [{ name: '产品', items: ['候选分子', '已上市'] }] },
  settings: { title: '基础设置', groups: [{ name: '通用', items: ['字段配置', '权限管理'] }] },
}

const props = withDefaults(
  defineProps<{
    /** 看板列表（{id,name}）。仅在「数据分析」段展示。 */
    dashboards?: { id: string; name: string }[]
    /** 当前选中看板 id */
    currentDashboardId?: string | null
    /** 二级侧栏标题（数据分析段） */
    analysisTitle?: string
  }>(),
  { dashboards: () => [], currentDashboardId: null, analysisTitle: '数据分析' },
)

const emit = defineEmits<{ (e: 'select-dashboard', id: string): void }>()

const route = useRoute()
const router = useRouter()

/** 当前激活的一级菜单 key。路由在数据分析（含看板）下 → analysis。 */
const activeKey = computed<string>(() => {
  if (route.path.startsWith('/dashboards') || route.path.startsWith('/analysis') || route.path === '/' || route.path.startsWith('/insights')) {
    return 'analysis'
  }
  return 'analysis'
})

const isAnalysis = computed(() => activeKey.value === 'analysis')

const sub = computed(() => SUB_PLACEHOLDER[activeKey.value] ?? { title: '', groups: [] })

function onRail(item: RailItem) {
  if (item.key === 'analysis') {
    // 已在数据分析域：回到看板总览或保持
    void router.push('/dashboards')
    return
  }
  toast.info(`「${item.label}」为占位菜单，即将上线`, { title: '占位' })
}

function selectDashboard(id: string) {
  emit('select-dashboard', id)
}
</script>

<template>
  <div class="shell-nav">
    <!-- 图标 rail（一级菜单） -->
    <nav class="rail" aria-label="主导航">
      <button
        v-for="item in RAIL_ITEMS"
        :key="item.key"
        type="button"
        class="rail__item"
        :class="{ 'rail__item--on': activeKey === item.key }"
        :aria-pressed="activeKey === item.key"
        :title="item.label"
        @click="onRail(item)"
      >
        <IIcon :name="item.icon" :size="18" />
        <span class="rail__label">{{ item.label }}</span>
      </button>
      <button
        type="button"
        class="rail__item rail__item--bottom"
        title="审计日志"
        @click="toast.info('「审计日志」为占位菜单，即将上线', { title: '占位' })"
      >
        <IIcon name="edit" :size="18" />
        <span class="rail__label">审计日志</span>
      </button>
    </nav>

    <!-- 二级侧栏 -->
    <aside class="sub" :aria-label="isAnalysis ? analysisTitle : sub.title">
      <div class="sub__head">
        <span class="sub__title">{{ isAnalysis ? analysisTitle : sub.title }}</span>
      </div>

      <!-- 数据分析：看板列表 -->
      <template v-if="isAnalysis">
        <div v-if="dashboards.length" class="sub__list" role="listbox" aria-label="看板列表">
          <button
            v-for="d in dashboards"
            :key="d.id"
            type="button"
            role="option"
            class="sub__item"
            :class="{ 'sub__item--on': d.id === currentDashboardId }"
            :aria-selected="d.id === currentDashboardId"
            :title="d.name"
            @click="selectDashboard(d.id)"
          >
            <IIcon name="grid" :size="14" class="sub__item-icon" />
            <span class="sub__item-name is-ellipsis">{{ d.name }}</span>
          </button>
        </div>
        <IEmptyState
          v-else
          icon="folder"
          title="还没有看板"
          description="在右侧新建看板。"
          class="sub__empty"
        />
      </template>

      <!-- 占位一级菜单：二级占位列表 -->
      <template v-else>
        <div class="sub__list">
          <div v-for="g in sub.groups" :key="g.name" class="sub__group">
            <div class="sub__group-head">{{ g.name }}</div>
            <button
              v-for="it in g.items"
              :key="it"
              type="button"
              class="sub__item"
              @click="toast.info(`「${it}」为占位项，即将上线`, { title: '占位' })"
            >
              <span class="sub__item-name is-ellipsis">{{ it }}</span>
            </button>
          </div>
        </div>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.shell-nav {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-shrink: 0;
}

/* ---- 图标 rail ---- */
.rail {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 8px 6px;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
}
.rail__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 2px;
  border: none;
  border-radius: var(--is-radius);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition:
    background var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.rail__item:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.rail__item--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  font-weight: 500;
}
.rail__label {
  line-height: 1;
  white-space: nowrap;
}
.rail__item--bottom {
  margin-top: auto;
}

/* ---- 二级侧栏 ---- */
.sub {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
  overflow-y: auto;
}
.sub__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.sub__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--is-text);
}
.sub__list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sub__group + .sub__group {
  margin-top: 8px;
}
.sub__group-head {
  padding: 6px 8px 4px;
  font-size: 12px;
  color: var(--is-text-tertiary);
}
.sub__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background var(--is-dur-fast) var(--is-ease);
}
.sub__item:hover {
  background: var(--is-surface-hover);
}
.sub__item--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
  font-weight: 500;
}
.sub__item-icon {
  flex-shrink: 0;
  color: inherit;
  opacity: 0.8;
}
.sub__item-name {
  min-width: 0;
  flex: 1;
}
.sub__empty {
  padding: 24px 12px;
}
</style>
