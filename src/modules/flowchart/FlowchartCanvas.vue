<template>
  <div class="flow" role="region" aria-label="分析流程图" @keydown.capture="onCanvasKeydown">
    <p class="sr-only">
      使用 Tab 聚焦节点，Enter 或 Space 选择并跳转到工作区；画布仅支持拖拽布局。
    </p>
    <div class="banner" role="note">修改分析结构请从侧栏进行；画布仅支持拖拽布局</div>
    <div v-if="!graph.nodes.length" class="flow-empty" role="status">
      <h3>流程图为空</h3>
      <p>请先通过「+ Add data」导入 CSV 或合并表，侧栏会出现节点后此处同步展示。</p>
    </div>
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      fit-view-on-init
      :nodes-draggable="true"
      :nodes-connectable="false"
      :elements-selectable="true"
      :nodes-focusable="true"
      @node-click="onNodeClick"
      @node-drag-stop="onDragStop"
    >
      <Background pattern-color="#c5cad3" :gap="18" />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueFlow, useVueFlow, type Edge, type Node, type NodeMouseEvent, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { flattenViews } from '@/modules/analysis/viewTree'

const props = defineProps<{ focusId?: string | null }>()
const store = useAnalysisStore()
const { setCenter, findNode, getSelectedNodes } = useVueFlow()

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

function nodeStyle(kind: 'table' | 'view', viewType: string | undefined, selected: boolean) {
  const base =
    kind === 'table'
      ? { background: '#f0f7ff', border: '1.5px solid #5b8ff9', color: '#1f2329' }
      : viewType === 'table'
        ? { background: '#f3faf0', border: '1.5px solid #52c41a', color: '#1f2329' }
        : { background: '#f7f2ff', border: '1.5px solid #9254de', color: '#1f2329' }
  return {
    ...base,
    borderRadius: '8px',
    padding: '8px 12px',
    minWidth: '140px',
    whiteSpace: 'pre-line' as const,
    fontWeight: selected ? 700 : 500,
    boxShadow: selected ? '0 0 0 3px rgba(47, 111, 237, 0.35)' : '0 1px 2px rgba(31,35,41,0.06)',
    outline: selected ? '2px solid var(--ia-accent, #2f6fed)' : 'none',
    outlineOffset: '1px',
    cursor: 'pointer',
  }
}

const graph = computed(() => {
  const a = store.current
  const selectedId = store.selectedNodeId
  if (!a) return { nodes: [] as Node[], edges: [] as Edge[] }
  const ns: Node[] = []
  const es: Edge[] = []
  for (const t of a.tables) {
    const pos = a.flowchartLayout[t.id] || { x: 80, y: 80 }
    ns.push({
      id: t.id,
      label: t.name,
      position: pos,
      data: { kind: 'table' },
      focusable: true,
      ariaLabel: `表：${t.name}`,
      style: nodeStyle('table', undefined, selectedId === t.id),
    })
    if (t.source.type === 'combine') {
      es.push({ id: `${t.source.leftTableId}-${t.id}`, source: t.source.leftTableId, target: t.id })
      es.push({ id: `${t.source.rightTableId}-${t.id}`, source: t.source.rightTableId, target: t.id })
    }
    for (const v of flattenViews(t.views)) {
      const vp = a.flowchartLayout[v.id] || { x: pos.x + 220, y: pos.y }
      ns.push({
        id: v.id,
        label: `${v.name}\n(${v.viewType})`,
        position: vp,
        data: { kind: 'view', viewType: v.viewType },
        focusable: true,
        ariaLabel: `视图：${v.name}，类型 ${v.viewType}`,
        style: nodeStyle('view', v.viewType, selectedId === v.id),
      })
      const parent = v.parentId || t.id
      es.push({ id: `${parent}-${v.id}`, source: parent, target: v.id })
    }
  }
  return { nodes: ns, edges: es }
})

watch(
  graph,
  (g) => {
    nodes.value = g.nodes
    edges.value = g.edges
  },
  { immediate: true, deep: true },
)

watch(
  () => props.focusId,
  async (id) => {
    if (!id) return
    const n = findNode(id)
    if (n) setCenter(n.position.x + 70, n.position.y + 20, { zoom: 1.2, duration: 400 })
  },
)

function onNodeClick(ev: NodeMouseEvent) {
  store.selectNode(ev.node.id, 'workspace')
}

function onDragStop(ev: NodeDragEvent) {
  store.setFlowchartPosition(ev.node.id, ev.node.position.x, ev.node.position.y)
}

function onCanvasKeydown(ev: KeyboardEvent) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return
  const selected = getSelectedNodes.value
  const id = selected[0]?.id
  if (!id) return
  ev.preventDefault()
  store.selectNode(id, 'workspace')
}
</script>

<style scoped>
.flow {
  height: 100%;
  position: relative;
  background: linear-gradient(180deg, #eef1f6 0%, #e4e8ef 100%);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.banner {
  position: absolute;
  z-index: 5;
  left: 50%;
  transform: translateX(-50%);
  top: 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #ad6800;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
}
.flow-empty {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  color: #646a73;
  background: rgba(238, 241, 246, 0.92);
}
.flow-empty h3 {
  margin: 0 0 8px;
  color: #1f2329;
  font-size: 18px;
}
.flow-empty p {
  margin: 0;
  max-width: 420px;
  font-size: 14px;
  line-height: 1.5;
}
/* Keyboard focus ring — stronger than selected shadow for a11y contrast */
:deep(.vue-flow__node:focus),
:deep(.vue-flow__node:focus-visible) {
  outline: 3px solid var(--ia-accent, #2f6fed) !important;
  outline-offset: 3px;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 6px rgba(47, 111, 237, 0.45) !important;
  z-index: 2;
}
:deep(.vue-flow__node.selected:not(:focus):not(:focus-visible)) {
  /* keep selection visible without competing with keyboard focus */
  outline: 2px solid var(--ia-accent, #2f6fed);
  outline-offset: 1px;
}
</style>
