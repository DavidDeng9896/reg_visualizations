<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Panel, VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'

import { useAnalysisStore, type SelectedNode } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, ITooltip } from '../../ui'
import {
  buildFlowGraph,
  downstreamOf,
  tableNodeId,
  upstreamOf,
  viewNodeId,
  type FlowGraph,
  type FlowNodeData,
} from './graph'
import { resolvePositions } from './layout'
import FlowNode from './FlowNode.vue'
import NodeDetailCard from './NodeDetailCard.vue'

/**
 * 流程图画布（DESIGN.md §5）：
 * 自动拓扑 + 拖拽布局持久化 + 缩放/平移 + 点击详情/导航 + 侧栏双向联动。
 * 只读拓扑：不可连线/删线/删节点。
 */
const emit = defineEmits<{ (e: 'add-data'): void }>()

const store = useAnalysisStore()
const { current, selected } = storeToRefs(store)

/* --------------------------------- 数据派生 --------------------------------- */

const graph = computed<FlowGraph>(() =>
  current.value ? buildFlowGraph(current.value) : { nodes: [], edges: [] },
)
const nodeById = computed(() => new Map(graph.value.nodes.map((n) => [n.id, n])))
const positions = computed(() => resolvePositions(graph.value, current.value?.flowchartLayout ?? {}))
const isEmpty = computed(() => graph.value.nodes.length === 0)
/** >200 节点降级：仅渲染可视元素。 */
const perfMode = computed(() => graph.value.nodes.length > 200)

/* ------------------------------- vue-flow 状态 ------------------------------ */

const FLOW_ID = 'insight-flowchart'
const { viewport, zoomIn, zoomOut, zoomTo, fitView } = useVueFlow({ id: FLOW_ID })

/**
 * 画布节点/边的本地轻量类型（结构上与 vue-flow Node/Edge 兼容）。
 * vue-flow 的 Node 泛型在 strict 下会触发 TS2589 深度实例化，故用最小形状。
 */
interface CanvasNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data?: FlowNodeData
  draggable?: boolean
  connectable?: boolean
  class?: string
}
interface CanvasEdge {
  id: string
  source: string
  target: string
  type?: string
  selectable?: boolean
  focusable?: boolean
  class?: string
}

const vfNodes = ref<CanvasNode[]>([])
const vfEdges = ref<CanvasEdge[]>([])
const activeId = ref<string | null>(null)
const hoverId = ref<string | null>(null)
const minimapOpen = ref(true)

const activeNode = computed(() => (activeId.value ? nodeById.value.get(activeId.value) ?? null : null))
const activeInputs = computed(() => (activeId.value ? upstreamOf(graph.value, activeId.value) : []))
const activeOutputs = computed(() => (activeId.value ? downstreamOf(graph.value, activeId.value) : []))

const zoomPercent = computed(() => Math.round((viewport.value.zoom || 1) * 100))

/** 与选中/悬停节点相连的节点集合（用于邻接高亮）。 */
const linkedIds = computed<Set<string>>(() => {
  const focus = activeId.value ?? hoverId.value
  const set = new Set<string>()
  if (!focus) return set
  for (const e of graph.value.edges) {
    if (e.source === focus) set.add(e.target)
    if (e.target === focus) set.add(e.source)
  }
  return set
})

function nodeClass(id: string): string {
  const cls: string[] = []
  if (id === activeId.value) cls.push('is-active')
  else if (linkedIds.value.has(id)) cls.push('is-linked')
  return cls.join(' ')
}
function edgeClass(source: string, target: string): string {
  const focus = activeId.value ?? hoverId.value
  return focus && (source === focus || target === focus) ? 'flow-edge--active' : ''
}

/** 全量重建（拓扑/数据变化时），保留已有节点当前位置避免拖拽态闪动。 */
function rebuild(): void {
  const prev = new Map<string, CanvasNode>()
  for (const n of vfNodes.value) prev.set(n.id, n)
  vfNodes.value = graph.value.nodes.map((n) => {
    const old = prev.get(n.id)
    return {
      id: n.id,
      type: 'flow',
      position: old ? { ...old.position } : (positions.value[n.id] ?? { x: 0, y: 0 }),
      data: n,
      draggable: true,
      connectable: false,
      class: nodeClass(n.id),
    }
  })
  vfEdges.value = graph.value.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'default',
    selectable: false,
    focusable: false,
    class: edgeClass(e.source, e.target),
  }))
  // 选中节点已被删除时清理
  if (activeId.value && !nodeById.value.has(activeId.value)) activeId.value = null
}
watch([graph, positions], rebuild, { immediate: true })

/** 仅刷新高亮 class（不触碰位置）。 */
function refreshHighlight(): void {
  for (const n of vfNodes.value) n.class = nodeClass(n.id)
  for (const e of vfEdges.value) e.class = edgeClass(e.source, e.target)
}
watch([activeId, hoverId, linkedIds], refreshHighlight)

/* --------------------------------- 顶部提示条 -------------------------------- */

const BANNER_KEY = 'insight-studio.flowchart-banner-dismissed'
const bannerVisible = ref(true)
try {
  bannerVisible.value = !localStorage.getItem(BANNER_KEY)
} catch {
  bannerVisible.value = true
}
function dismissBanner(): void {
  bannerVisible.value = false
  try {
    localStorage.setItem(BANNER_KEY, '1')
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

/* --------------------------------- 选中联动 --------------------------------- */

function selectionToFlowId(sel: SelectedNode | null): string | null {
  if (!sel) return null
  const id = sel.kind === 'table' ? tableNodeId(sel.tableId) : sel.viewId ? viewNodeId(sel.viewId) : null
  return id && nodeById.value.has(id) ? id : null
}

/** 画布内选中（同步 store，但不切模式）。 */
function setActive(id: string | null): void {
  activeId.value = id
  const n = id ? nodeById.value.get(id) : null
  if (!n) {
    store.setSelected(null)
    return
  }
  if (n.kind === 'table') store.setSelected({ kind: 'table', tableId: n.tableId })
  else if (n.kind === 'view' && n.viewId) store.setSelected({ kind: 'view', tableId: n.tableId, viewId: n.viewId })
  // combine-step 无侧栏对应节点，不回写选中
}

/** 外部（侧栏/工作区）选中 → 高亮并居中。画布内点击先写 activeId，watcher 比对后不重复居中。 */
watch(selected, (sel) => {
  const flowId = selectionToFlowId(sel)
  if (flowId === activeId.value) return
  activeId.value = flowId
  if (flowId) void centerOn(flowId)
})

async function centerOn(id: string): Promise<void> {
  await nextTick()
  if (!nodeById.value.has(id)) return
  await fitView({ nodes: [id], duration: 300, padding: 0.35, maxZoom: 1.2 })
}

/** 首次进入流程图：若已有选中（如侧栏「在流程图中显示」），居中定位。 */
onMounted(() => {
  const flowId = selectionToFlowId(selected.value)
  if (flowId) {
    activeId.value = flowId
    void centerOn(flowId)
  }
})

/* --------------------------------- 画布交互 --------------------------------- */

function onNodeClick(e: NodeMouseEvent): void {
  setActive(e.node.id)
}
function onPaneClick(): void {
  setActive(null)
}
function onNodeMouseEnter(e: NodeMouseEvent): void {
  hoverId.value = e.node.id
}
function onNodeMouseLeave(): void {
  hoverId.value = null
}

/** 双击 / 打开按钮 → 跳回工作区并选中该表/视图（store.select 会切模式）。 */
function openInWorkspace(id: string): void {
  const n = nodeById.value.get(id)
  if (!n) return
  if (n.kind === 'view' && n.viewId) store.select({ kind: 'view', tableId: n.tableId, viewId: n.viewId })
  else store.select({ kind: 'table', tableId: n.tableId })
}

function focusNode(id: string): void {
  setActive(id)
  void centerOn(id)
}

/** 拖拽结束 → 持久化坐标到 analysis.flowchartLayout。 */
function onNodeDragStop(e: NodeDragEvent): void {
  const dragged = e.nodes?.length ? e.nodes : e.node ? [e.node] : []
  if (!dragged.length) return
  store.mutate((a) => {
    for (const n of dragged) {
      a.flowchartLayout[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    }
  })
}

/* --------------------------------- 键盘 --------------------------------- */

function onKeydown(e: KeyboardEvent): void {
  // 输入框内（重命名等）不拦截 Esc
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'Escape' && activeId.value) setActive(null)
  // Delete/Backspace 不生效（只读拓扑）
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onActivated(() => window.addEventListener('keydown', onKeydown))
onDeactivated(() => window.removeEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* --------------------------------- 小地图 --------------------------------- */

function minimapNodeColor(node: { data?: unknown }): string {
  const kind = (node.data as FlowNodeData | undefined)?.kind
  if (kind === 'combine-step') return '#b7e8d0'
  if (kind === 'view') return '#8fd7b5'
  return '#5cc795'
}
</script>

<template>
  <div class="flow-canvas" :class="{ 'flow-canvas--perf': perfMode }">
    <!-- 顶部黄色提示条（可关闭，localStorage 记忆） -->
    <Transition name="flow-banner">
      <div v-if="bannerVisible" class="flow-banner" role="status">
        <IIcon name="warning" :size="14" class="flow-banner__icon" />
        <span class="flow-banner__text">流程图为只读浏览，拖节点仅调整布局；修改分析结构请从侧栏进行</span>
        <button type="button" class="flow-banner__close" aria-label="关闭提示" @click="dismissBanner">
          <IIcon name="close" :size="13" />
        </button>
      </div>
    </Transition>

    <VueFlow
      :id="FLOW_ID"
      v-model:nodes="vfNodes"
      v-model:edges="vfEdges"
      class="flow-canvas__vf"
      :nodes-connectable="false"
      :nodes-draggable="true"
      :edges-focusable="false"
      :elements-selectable="false"
      :edges-updatable="false"
      :delete-key-code="null"
      :min-zoom="0.25"
      :max-zoom="2"
      :only-render-visible-elements="perfMode"
      fit-view-on-init
      @node-click="onNodeClick"
      @node-double-click="(e: NodeMouseEvent) => openInWorkspace(e.node.id)"
      @node-drag-stop="onNodeDragStop"
      @node-mouse-enter="onNodeMouseEnter"
      @node-mouse-leave="onNodeMouseLeave"
      @pane-click="onPaneClick"
    >
      <Background variant="dots" :gap="20" :size="1" pattern-color="#d0d5dd" bg-color="#fbfcfd" />

      <MiniMap
        v-if="minimapOpen && !isEmpty"
        position="bottom-right"
        :pannable="true"
        :zoomable="true"
        :width="168"
        :height="112"
        :node-color="minimapNodeColor"
        mask-color="rgba(247, 248, 250, 0.7)"
        class="flow-minimap"
      />

      <!-- 左下自定义缩放控件：− 百分比 + 适应视图 小地图 -->
      <Panel position="bottom-left" class="flow-controls">
        <ITooltip content="缩小">
          <button type="button" class="flow-controls__btn" aria-label="缩小" @click="zoomOut()">
            <IIcon name="minus" :size="14" />
          </button>
        </ITooltip>
        <button
          type="button"
          class="flow-controls__zoom"
          title="重置为 100%"
          aria-label="重置缩放"
          @click="zoomTo(1, { duration: 200 })"
        >
          {{ zoomPercent }}%
        </button>
        <ITooltip content="放大">
          <button type="button" class="flow-controls__btn" aria-label="放大" @click="zoomIn()">
            <IIcon name="plus" :size="14" />
          </button>
        </ITooltip>
        <span class="flow-controls__sep" />
        <ITooltip content="适应视图">
          <button type="button" class="flow-controls__btn" aria-label="适应视图" @click="fitView({ duration: 300, padding: 0.15 })">
            <IIcon name="expand" :size="14" />
          </button>
        </ITooltip>
        <ITooltip :content="minimapOpen ? '隐藏小地图' : '显示小地图'">
          <button
            type="button"
            class="flow-controls__btn"
            :class="{ 'flow-controls__btn--on': minimapOpen }"
            aria-label="切换小地图"
            :aria-pressed="minimapOpen"
            @click="minimapOpen = !minimapOpen"
          >
            <IIcon name="flowchart" :size="14" />
          </button>
        </ITooltip>
      </Panel>

      <template #node-flow="slotProps">
        <FlowNode
          :id="slotProps.id"
          :data="slotProps.data"
          :selected="slotProps.selected"
          @open="openInWorkspace"
        />
      </template>
    </VueFlow>

    <!-- 空态 -->
    <div v-if="isEmpty" class="flow-empty">
      <IEmptyState
        icon="flowchart"
        title="还没有数据"
        description="导入 CSV 或合并表后，这里会展示数据表与视图的派生流程"
      >
        <IButton variant="primary" icon="plus" @click="emit('add-data')">Add data</IButton>
      </IEmptyState>
    </div>

    <!-- 右侧节点详情卡（300px，200ms 滑出） -->
    <Transition name="flow-detail">
      <NodeDetailCard
        v-if="activeNode"
        :key="activeNode.id"
        class="flow-canvas__detail"
        :node="activeNode"
        :inputs="activeInputs"
        :outputs="activeOutputs"
        @close="setActive(null)"
        @focus="focusNode"
        @open="openInWorkspace(activeNode.id)"
      />
    </Transition>
  </div>
</template>

<style scoped>
.flow-canvas {
  position: relative;
  height: 100%;
  min-height: 0;
}
.flow-canvas__vf {
  height: 100%;
}

/* ------------------------------- 顶部提示条 ------------------------------- */
.flow-banner {
  position: absolute;
  top: 12px;
  left: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(560px, calc(100% - 32px));
  padding: 8px 10px;
  background: var(--is-warning-bg);
  border: 1px solid #f3e3b3;
  border-left: 3px solid #e3a008;
  border-radius: var(--is-radius-sm);
  box-shadow: var(--is-shadow-sm);
  font-size: var(--is-text-sm);
  color: var(--is-warning-text);
}
.flow-banner__icon {
  flex-shrink: 0;
}
.flow-banner__text {
  flex: 1;
  min-width: 0;
}
.flow-banner__close {
  display: inline-flex;
  padding: 3px;
  border-radius: 4px;
  color: var(--is-warning-text);
  flex-shrink: 0;
}
.flow-banner__close:hover {
  background: rgba(138, 109, 26, 0.12);
}
.flow-banner-enter-active,
.flow-banner-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.flow-banner-enter-from,
.flow-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ------------------------------- 缩放控件 ------------------------------- */
.flow-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.flow-controls__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.flow-controls__btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.flow-controls__btn--on {
  color: var(--is-accent);
  background: var(--is-accent-soft);
}
.flow-controls__zoom {
  min-width: 44px;
  height: 26px;
  padding: 0 6px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-text-secondary);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.flow-controls__zoom:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.flow-controls__sep {
  width: 1px;
  height: 16px;
  background: var(--is-border);
  margin: 0 3px;
}

/* -------------------------------- 小地图 -------------------------------- */
.flow-minimap {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}

/* -------------------------------- 空态 -------------------------------- */
.flow-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(251, 252, 253, 0.85);
  z-index: 4;
}

/* ------------------------------- 详情卡 ------------------------------- */
.flow-canvas__detail {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 6;
}
.flow-detail-enter-active,
.flow-detail-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.flow-detail-enter-from,
.flow-detail-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>

<style>
/* vue-flow 边样式（非 scoped：边由库渲染） */
.flow-canvas .vue-flow__edge-path {
  stroke: #98a2b3;
  stroke-width: 1.5;
}
.flow-canvas .vue-flow__edge.flow-edge--active .vue-flow__edge-path {
  stroke: var(--is-success);
  stroke-width: 2;
}
.flow-canvas .vue-flow__edge {
  pointer-events: none;
}
/* 性能模式：关闭抗锯齿 */
.flow-canvas--perf .vue-flow__edge-path {
  shape-rendering: optimizeSpeed;
}
</style>
