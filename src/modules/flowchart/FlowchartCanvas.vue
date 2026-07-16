<template>
  <div class="flow">
    <div class="banner">修改分析结构请从侧栏进行；画布仅支持拖拽布局</div>
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      fit-view-on-init
      :nodes-draggable="true"
      :nodes-connectable="false"
      :elements-selectable="true"
      @node-click="onNodeClick"
      @node-drag-stop="onDragStop"
    >
      <Background />
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
const { setCenter, findNode } = useVueFlow()

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

const graph = computed(() => {
  const a = store.current
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
      style: { background: '#fff', border: '1px solid #91caff', borderRadius: '8px', padding: '8px 12px', minWidth: '140px' },
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
        style: {
          background: v.viewType === 'table' ? '#f6ffed' : '#f9f0ff',
          border: '1px solid #b7eb8f',
          borderRadius: '8px',
          padding: '8px 12px',
          whiteSpace: 'pre-line',
          minWidth: '140px',
        },
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
</script>

<style scoped>
.flow {
  height: 100%;
  position: relative;
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
</style>
