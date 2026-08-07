<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Panel, VueFlow, useVueFlow } from '@vue-flow/core'
import type { Connection, NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'

import { useAnalysisStore, type SelectedNode } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, ISplitPane, ITooltip, toast } from '../../ui'
import { buildFlowGraph, downstreamOf, resolveStepSourceRef, stepNodeId, upstreamOf, viewNodeId, type FlowGraph, type FlowNodeData } from './graph'
import { autoLayout, resolvePositions } from './layout'
import FlowNode from './FlowNode.vue'
import FlowEdge from './FlowEdge.vue'
import type { DetailLayout } from './NodeDetailCard.vue'

/** 详情/配置面板按需加载，避免首开 flowchart 连带 ChartPanel 等重模块 */
const NodeDetailCard = defineAsyncComponent(() => import('./NodeDetailCard.vue'))
const AddStepPanel = defineAsyncComponent(() => import('./AddStepPanel.vue'))
const StepConfigPanel = defineAsyncComponent(() => import('../steps/panel/StepConfigPanel.vue'))
import { canConnectPorts } from './connection'
import { getStepDef } from '../steps/registry'
import { uuid } from '../../shared/id'
import type { PortType, StepInputRef, StepNode, StepType } from '../../shared/types'
import { debounce } from '../charts/draft'
import { createStepNode } from '../steps/factory'
import { runStepAsync, IMPLEMENTED_STEP_TYPES } from '../steps/exec'
import { hasStaleSteps, rerunStaleSteps } from '../steps/rerun'

/**
 * 流程图可编辑画布：
 * - 基于 StepNode 自动拓扑 + 拖拽布局持久化
 * - 节点三态、类型化端口
 * - 拖线到空白处 → Add step 目录面板
 * - 拖线到合法端口 → 自动连线
 * - 点击节点详情卡 / 双击打开工作区
 */
const emit = defineEmits<{ (e: 'add-data'): void }>()

const store = useAnalysisStore()
const { current, selected, loading } = storeToRefs(store)

/* --------------------------------- 数据派生 --------------------------------- */

const graph = computed<FlowGraph>(() =>
  current.value ? buildFlowGraph(current.value) : { nodes: [], edges: [] },
)
const nodeById = computed(() => new Map(graph.value.nodes.map((n) => [n.id, n])))
const positions = computed(() => resolvePositions(graph.value, current.value?.flowchartLayout ?? {}))
/** 加载中或尚无 current 时不展示空态，避免半透明 loading 下透出「还没有数据」。 */
const isEmpty = computed(() => !loading.value && !!current.value && graph.value.nodes.length === 0)
const perfMode = computed(() => graph.value.nodes.length > 200)
const staleCount = computed(() => (current.value ? current.value.steps.filter((s) => s.status === 'stale').length : 0))
const hasStale = computed(() => (current.value ? hasStaleSteps(current.value) : false))

/** 重新运行所有 stale 步骤（拓扑序），恢复 configured。 */
function runAll(): void {
  if (!current.value) return
  store.mutate((a) => {
    const n = rerunStaleSteps(a)
    if (n > 0) toast.success(`已重新运行 ${n} 个步骤`)
  })
}

/* ------------------------------- vue-flow 状态 ------------------------------ */

const FLOW_ID = 'insight-flowchart'
const { viewport, zoomIn, zoomOut, zoomTo, fitView, findNode, updateNodeInternals } = useVueFlow({ id: FLOW_ID })

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
  sourceHandle?: string
  targetHandle?: string
  type?: string
  selectable?: boolean
  focusable?: boolean
  class?: string
  data?: { portType?: PortType }
}

const vfNodes = ref<CanvasNode[]>([])
const vfEdges = ref<CanvasEdge[]>([])
const activeId = ref<string | null>(null)
const hoverId = ref<string | null>(null)
const isConnecting = ref(false)
const minimapOpen = ref(false)
/**
 * KeepAlive deactivate 时画布 DOM 被移入隐藏容器（尺寸 0），
 * vue-flow Background/MiniMap 会算出 NaN 并刷屏 SVG 错误——非活跃期不渲染它们。
 */
const alive = ref(true)

const activeNode = computed(() => (activeId.value ? nodeById.value.get(activeId.value) ?? null : null))
const activeInputs = computed(() => (activeId.value ? upstreamOf(graph.value, activeId.value) : []))
const activeOutputs = computed(() => (activeId.value ? downstreamOf(graph.value, activeId.value) : []))
/**
 * 右侧/下侧分栏是否展示：选中节点详情，或正在编辑步骤配置。
 * 步骤配置与节点详情共用 ISplitPane，避免绝对定位抽屉盖住画布。
 */
const detailOpen = computed(() => !!editingStepData.value || !!activeNode.value)

/** 编辑宽面板（Custom Code / 报告）时略提高第二栏下限，便于预览。 */
const splitMinSecond = computed(() => {
  if (detailLayout.value === 'bottom') return 160
  const t = editingStepData.value?.type
  if (t === 'custom-code' || t === 'report') return 380
  return 300
})
const zoomPercent = computed(() => Math.round((viewport.value.zoom || 1) * 100))

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

/* 重建时按内容复用未变节点/边对象，避免全量 FlowNode/FlowEdge 重渲染 */
function samePortList(a: FlowNodeData['inputs'], b: FlowNodeData['inputs']): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name || a[i].type !== b[i].type) return false
  }
  return true
}
function sameNodeData(a: FlowNodeData | undefined, b: FlowNodeData): boolean {
  if (!a) return false
  return (
    a.kind === b.kind &&
    a.label === b.label &&
    a.stepId === b.stepId &&
    a.viewId === b.viewId &&
    a.tableId === b.tableId &&
    a.viewType === b.viewType &&
    a.stepType === b.stepType &&
    a.status === b.status &&
    a.error === b.error &&
    a.rowCount === b.rowCount &&
    a.columnCount === b.columnCount &&
    a.viewCount === b.viewCount &&
    a.childCount === b.childCount &&
    a.valid === b.valid &&
    samePortList(a.inputs, b.inputs) &&
    samePortList(a.outputs, b.outputs)
  )
}

function rebuild(): void {
  const prev = new Map<string, CanvasNode>()
  for (const n of vfNodes.value) prev.set(n.id, n)
  vfNodes.value = graph.value.nodes.map((n) => {
    const old = prev.get(n.id)
    // 数据未变：复用旧对象（保留位置与组件实例），仅按需刷新 class
    if (old && sameNodeData(old.data, n)) {
      const cls = nodeClass(n.id)
      if (old.class !== cls) old.class = cls
      return old
    }
    return {
      id: n.id,
      type: 'flow',
      position: old ? { ...old.position } : (positions.value[n.id] ?? { x: 0, y: 0 }),
      data: n,
      draggable: true,
      connectable: true,
      class: nodeClass(n.id),
    }
  })
  const prevEdges = new Map<string, CanvasEdge>()
  for (const e of vfEdges.value) prevEdges.set(e.id, e)
  vfEdges.value = graph.value.edges.map((e) => {
    const portType = nodeById.value.get(e.source)?.outputs.find((p) => p.name === e.sourcePort)?.type
    const old = prevEdges.get(e.id)
    if (
      old &&
      old.source === e.source &&
      old.target === e.target &&
      old.sourceHandle === e.sourcePort &&
      old.targetHandle === e.targetPort &&
      old.data?.portType === portType
    ) {
      const cls = edgeClass(e.source, e.target)
      if (old.class !== cls) old.class = cls
      return old
    }
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourcePort,
      targetHandle: e.targetPort,
      type: 'flow',
      selectable: false,
      focusable: false,
      class: edgeClass(e.source, e.target),
      data: { portType },
    }
  })
  if (activeId.value && !nodeById.value.has(activeId.value)) activeId.value = null
}

let rebuildPrimed = false
const rebuildDeb = debounce(rebuild, 64)
watch([graph, positions], () => {
  // 首次同步填充，避免 64ms 空画布 + fit-view-on-init 对空图
  if (!rebuildPrimed) {
    rebuildPrimed = true
    rebuild()
    void nextTick(() => {
      if (!isEmpty.value) fitAll(0)
    })
    return
  }
  rebuildDeb.call()
}, { immediate: true })

/**
 * VueFlow 的 Handle 在 onMounted 时依赖节点尺寸注册 handleBounds；
 * 节点尺寸由 ResizeObserver 异步测量，需延后更新，否则拖线可能不触发 connect-start。
 * 仅在结构（节点增删/端口数变化）时更新，避免每次 graph 变化双次全量刷新。
 */
const structureSig = computed(() => graph.value.nodes.map((n) => `${n.id}:${n.inputs.length}/${n.outputs.length}`).join('|'))
function scheduleHandleBoundsUpdate(): void {
  void nextTick(() => {
    updateNodeInternals()
    setTimeout(() => updateNodeInternals(), 120)
  })
}
watch(structureSig, scheduleHandleBoundsUpdate, { flush: 'post' })

/* 高亮刷新：只在 class 实际变化时写，避免每次 hover 触发全量节点/边响应式更新 */
function refreshHighlight(): void {
  for (const n of vfNodes.value) {
    const cls = nodeClass(n.id)
    if (n.class !== cls) n.class = cls
  }
  for (const e of vfEdges.value) {
    const cls = edgeClass(e.source, e.target)
    if (e.class !== cls) e.class = cls
  }
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
    /* ignore */
  }
}

/* ------------------------------- 详情展示方式 ------------------------------- */

const DETAIL_LAYOUT_KEY = 'insight-studio:flow-detail-layout'
// 需求：详情面板不允许浮窗形式，默认右侧固定；旧版存储的 float 归一为 right
const detailLayout = ref<DetailLayout>('right')
try {
  const v = localStorage.getItem(DETAIL_LAYOUT_KEY)
  if (v === 'right' || v === 'bottom') detailLayout.value = v
} catch {
  /* ignore */
}
function setDetailLayout(layout: DetailLayout): void {
  detailLayout.value = layout
  try {
    localStorage.setItem(DETAIL_LAYOUT_KEY, layout)
  } catch {
    /* ignore */
  }
}

/* --------------------------------- 选中联动 --------------------------------- */

function selectionToFlowId(sel: SelectedNode | null): string | null {
  if (!sel) return null
  if (sel.kind === 'view' && sel.viewId) {
    const id = viewNodeId(sel.viewId)
    return nodeById.value.has(id) ? id : null
  }
  // 表选中：找到产出该表的步骤节点
  const table = current.value?.tables.find((t) => t.id === sel.tableId)
  if (table?.stepId) {
    const id = stepNodeId(table.stepId)
    return nodeById.value.has(id) ? id : null
  }
  return null
}

function setActive(id: string | null): void {
  activeId.value = id
  const n = id ? nodeById.value.get(id) : null
  if (!n) {
    store.setSelected(null)
    return
  }
  if (n.kind === 'view' && n.viewId && n.tableId) {
    store.setSelected({ kind: 'view', tableId: n.tableId, viewId: n.viewId })
  } else if (n.kind === 'step' && n.stepId) {
    const table = current.value?.tables.find((t) => t.stepId === n.stepId)
    if (table) store.setSelected({ kind: 'table', tableId: table.id })
  }
}

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

/**
 * 适应视图：仅「添加步骤」仍为叠层抽屉时预留右侧 padding；
 * 步骤配置已进 ISplitPane，画布宽度会随分割自动收缩，无需额外 padding。
 */
const FIT_PANEL_WIDTH = 340
function fitAll(duration = 300): void {
  const panelOpen = addStepOpen.value
  void fitView({
    duration,
    maxZoom: 1.25,
    padding: { top: 0.15, bottom: 0.15, left: 0.15, right: panelOpen ? `${FIT_PANEL_WIDTH + 100}px` : 0.15 },
  })
}

/** 全自动排列：按血缘分层重写所有节点坐标，视图紧跟所属数据。 */
function arrangeAll(): void {
  if (!current.value || isEmpty.value) return
  const layout = autoLayout(graph.value)
  store.mutate((a) => {
    a.flowchartLayout = { ...layout }
  })
  // rebuild 对已有节点保留拖拽坐标；此处强制覆盖为自动布局结果
  for (const n of vfNodes.value) {
    const p = layout[n.id]
    if (p) n.position = { x: p.x, y: p.y }
  }
  void nextTick(() => fitAll())
  toast.success('已自动排列节点')
}

onMounted(() => {
  // MiniMap 延后一帧，让主图先上屏
  requestAnimationFrame(() => {
    minimapOpen.value = true
  })
  const flowId = selectionToFlowId(selected.value)
  if (flowId) {
    activeId.value = flowId
    void centerOn(flowId)
  }
  scheduleHandleBoundsUpdate()
})

/* --------------------------------- 打开工作区 -------------------------------- */

function openInWorkspace(id: string): void {
  const n = nodeById.value.get(id)
  if (!n) return
  if (n.kind === 'view' && n.viewId && n.tableId) {
    store.select({ kind: 'view', tableId: n.tableId, viewId: n.viewId })
  } else if (n.kind === 'step' && n.stepId) {
    const table = current.value?.tables.find((t) => t.stepId === n.stepId)
    if (table) store.select({ kind: 'table', tableId: table.id })
  }
}

function focusNode(id: string): void {
  setActive(id)
  void centerOn(id)
}

/* --------------------------------- 拖拽布局 -------------------------------- */

function onNodeDragStop(e: NodeDragEvent): void {
  const dragged = e.nodes?.length ? e.nodes : e.node ? [e.node] : []
  if (!dragged.length) return
  store.mutate((a) => {
    for (const n of dragged) {
      a.flowchartLayout[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    }
  })
}

/* --------------------------------- 画布交互 -------------------------------- */

function onNodeClick(e: NodeMouseEvent): void {
  setActive(e.node.id)
}
function onPaneClick(): void {
  setActive(null)
  if (skipNextPaneClick.value) {
    skipNextPaneClick.value = false
    return
  }
  closePanels()
}
function onNodeMouseEnter(e: NodeMouseEvent): void {
  hoverId.value = e.node.id
}
function onNodeMouseLeave(): void {
  hoverId.value = null
}

/* --------------------------------- 连接：拖线加步骤 -------------------------------- */

const pendingSource = ref<{ nodeId: string; port: string } | null>(null)
const addStepOpen = ref(false)
const addStepSource = ref<{ nodeId: string; port: string } | null>(null)
/** 拖线到空白处松开后，VueFlow 会触发 pane-click；需要跳过这一次 pane-click，避免刚打开的 AddStepPanel 被关闭。 */
const skipNextPaneClick = ref(false)

function closePanels(): void {
  addStepOpen.value = false
  addStepSource.value = null
  skipNextPaneClick.value = false
  if (editingStep.value) closeStepEditor(true)
}

function onConnectStart({ nodeId, handleId }: { nodeId?: string; handleId?: string | null }): void {
  if (!nodeId || !handleId) return
  isConnecting.value = true
  pendingSource.value = { nodeId, port: handleId }
}

function onConnect(conn: Connection): void {
  pendingSource.value = null
  isConnecting.value = false
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return
  const sourceNode = nodeById.value.get(conn.source)
  const targetNode = nodeById.value.get(conn.target)
  if (!sourceNode || !targetNode) return

  const sourcePort = sourceNode.outputs.find((p) => p.name === conn.sourceHandle)
  const targetPort = targetNode.inputs.find((p) => p.name === conn.targetHandle)
  if (!sourcePort || !targetPort || !canConnectPorts(sourcePort, targetPort)) return

  const sourceRef = current.value ? resolveStepSourceRef(current.value, sourceNode, sourcePort.name) : null
  if (!sourceRef) return

  // 更新目标步骤的输入
  store.mutate((a) => {
    const step = a.steps.find((s) => s.id === targetNode.stepId)
    if (!step) return
    // 移除同端口旧连接
    step.inputs = step.inputs.filter((i) => i.port !== targetPort.name)
    const ref: StepInputRef = {
      port: targetPort.name,
      from: { nodeId: sourceRef.nodeId, port: sourceRef.port },
    }
    if (targetPort.multiple) {
      step.inputs.push(ref)
    } else {
      step.inputs = [...step.inputs, ref]
    }
    // 尝试执行目标步骤
    step.status = 'running'
  })

  // 在下一个 tick 执行并持久化
  void nextTick(async () => {
    const step = current.value?.steps.find((s) => s.id === targetNode.stepId)
    if (step && current.value) {
      await runStepAsync(current.value, step)
      store.mutate(() => {})
    }
  })
}

function onConnectEnd(_event?: MouseEvent): void {
  isConnecting.value = false
  // 如果 pendingSource 仍然存在，说明没有连到合法端口 → 打开 Add step 面板
  if (!pendingSource.value) return
  addStepSource.value = pendingSource.value
  addStepOpen.value = true
  skipNextPaneClick.value = true
  pendingSource.value = null
}

/** 当前 Add step 面板源端口的数据类型（用于过滤可连接的步骤）。 */
const addStepSourcePortType = computed(() => {
  if (!addStepSource.value) return null
  const node = nodeById.value.get(addStepSource.value.nodeId)
  return node?.outputs.find((p) => p.name === addStepSource.value!.port)?.type ?? null
})

/* --------------------------------- Add step 回调 -------------------------------- */

function onStepSelected(type: StepType): void {
  if (!addStepSource.value || !current.value) return
  const def = getStepDef(type)
  const newStep: StepNode = {
    id: uuid(),
    type,
    name: def.label,
    inputs: [],
    config: JSON.parse(JSON.stringify(def.defaultConfig)),
    status: 'pending',
    output: { tables: [], files: [], views: [] },
  }

  // 自动连接源端口到第一个合法输入端口
  const sourceNodeId = addStepSource.value.nodeId
  const sourcePortName = addStepSource.value.port
  const sourceNode = nodeById.value.get(sourceNodeId)
  const sourcePort = sourceNode?.outputs.find((p) => p.name === sourcePortName)
  const targetPort = def.inputs.find((p) => sourcePort && canConnectPorts(sourcePort, p))

  if (targetPort && sourceNode && current.value) {
    const sourceRef = resolveStepSourceRef(current.value, sourceNode, sourcePortName)
    if (sourceRef) {
      newStep.inputs.push({
        port: targetPort.name,
        from: { nodeId: sourceRef.nodeId, port: sourceRef.port },
      })
    }
  }

  // 放置位置交给 resolvePositions：新节点落在已落位父节点右侧并自动避让，
  // 避免写入 flowchartLayout 导致与既有节点重叠。
  const newNodeId = stepNodeId(newStep.id)

  store.mutate((a) => {
    a.steps.push(newStep)
  })

  addStepOpen.value = false
  addStepSource.value = null

  // 打开配置面板（标记为新建，Cancel/Esc 将撤销该节点）
  void nextTick(() => {
    openStepEditor(newStep.id, true)
    setActive(newNodeId)
  })
}

/** 添加独立报告节点（无需连线）。 */
function addReportNode(): void {
  if (!current.value) return
  const step = createStepNode('report', '分析报告')
  store.mutate((a) => {
    a.steps.push(step)
  })
  const newNodeId = stepNodeId(step.id)
  void nextTick(() => {
    openStepEditor(step.id, true)
    setActive(newNodeId)
  })
}

/* --------------------------------- 步骤编辑面板 -------------------------------- */

const editingStep = ref<string | null>(null)
/** 本次编辑是否为「拖线新建的步骤」（Cancel/Esc 时撤销节点与连线）。 */
const editingIsNew = ref(false)
/** 打开编辑时的草稿快照（name + config），Cancel/Esc/点空白时恢复。 */
const editingSnapshot = ref<{ name: string; config: string; inputs: string } | null>(null)

const editingStepData = computed(() => {
  if (!editingStep.value || !current.value) return null
  return current.value.steps.find((s) => s.id === editingStep.value) ?? null
})

function openStepEditor(stepId: string, isNew: boolean): void {
  const s = current.value?.steps.find((s) => s.id === stepId)
  if (!s) return
  editingStep.value = stepId
  editingIsNew.value = isNew
  editingSnapshot.value = {
    name: s.name,
    config: JSON.stringify(s.config),
    inputs: JSON.stringify(s.inputs),
  }
}

/** 关闭编辑面板；cancel=true 时恢复快照，新建的步骤连同布局一起撤销。 */
function closeStepEditor(cancel: boolean): void {
  if (!editingStep.value || !current.value) {
    editingStep.value = null
    return
  }
  const stepId = editingStep.value
  if (cancel && editingIsNew.value) {
    deleteStep(stepId)
  } else if (cancel && editingSnapshot.value) {
    const s = current.value.steps.find((s) => s.id === stepId)
    if (s) {
      s.name = editingSnapshot.value.name
      s.config = JSON.parse(editingSnapshot.value.config)
      s.inputs = JSON.parse(editingSnapshot.value.inputs)
    }
  }
  editingStep.value = null
  editingIsNew.value = false
  editingSnapshot.value = null
}

function onStepSaved(name: string): void {
  if (!editingStepData.value || !current.value) return
  const step = editingStepData.value
  store.mutate(() => {
    step.name = name
    // 源步骤（upload-csv 等无执行逻辑）：重命名同步到输出表
    if (!IMPLEMENTED_STEP_TYPES.has(step.type)) {
      const outTable = step.output.tables[0] ? current.value!.tables.find((t) => t.id === step.output.tables[0]) : undefined
      if (outTable) outTable.name = name
    }
  })
  if (IMPLEMENTED_STEP_TYPES.has(step.type)) {
    void runStepAsync(current.value, step).then(() => {
      store.mutate(() => {})
    })
  }
  editingStep.value = null
  editingIsNew.value = false
  editingSnapshot.value = null
}

/** 删除步骤及其输出表（调用方需先确认无下游依赖）。 */
function deleteStep(stepId: string): void {
  store.mutate((a) => {
    a.steps = a.steps.filter((s) => s.id !== stepId)
    a.tables = a.tables.filter((t) => t.stepId !== stepId)
    delete a.flowchartLayout[stepNodeId(stepId)]
  })
  if (editingStep.value === stepId) editingStep.value = null
  if (activeId.value === stepNodeId(stepId)) activeId.value = null
}

function onStepDeleted(stepId: string): void {
  if (!current.value) return
  const dependents = current.value.steps.filter((s) => s.inputs.some((i) => i.from.nodeId === stepId))
  if (dependents.length) {
    toast.error(`无法删除：以下步骤依赖它 — ${dependents.map((d) => d.name).join('、')}。请先删除下游步骤。`)
    return
  }
  deleteStep(stepId)
}

/* --------------------------------- 键盘 --------------------------------- */

function onKeydown(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'Escape') {
    if (addStepOpen.value) {
      addStepOpen.value = false
      return
    }
    if (editingStep.value) {
      closeStepEditor(true)
      return
    }
    if (activeId.value) setActive(null)
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onActivated(() => {
  alive.value = true
  window.addEventListener('keydown', onKeydown)
})
onDeactivated(() => {
  alive.value = false
  window.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* --------------------------------- 小地图 -------------------------------- */

function minimapNodeColor(node: { data?: unknown }): string {
  const d = node.data as FlowNodeData | undefined
  if (d?.kind === 'view') return '#8fd7b5'
  if (d?.status === 'pending' || d?.status === 'failed') return '#f3e3b3'
  return '#5cc795'
}
</script>

<template>
  <div class="flow-canvas" :class="{ 'flow-canvas--perf': perfMode, 'is-connecting': isConnecting }">
    <Transition name="flow-banner">
      <div v-if="bannerVisible" class="flow-banner" role="status">
        <IIcon name="warning" :size="14" class="flow-banner__icon" />
        <span class="flow-banner__text">流程图即编辑器：拖出端口连线添加步骤；视图节点双击打开工作区</span>
        <button type="button" class="flow-banner__close" aria-label="关闭提示" @click="dismissBanner">
          <IIcon name="close" :size="13" />
        </button>
      </div>
    </Transition>

    <ISplitPane
      class="flow-canvas__split"
      :class="[`flow-canvas__split--${detailLayout}`, { 'flow-canvas__split--solo': !detailOpen }]"
      :direction="detailLayout === 'bottom' ? 'vertical' : 'horizontal'"
      :default-ratio="detailLayout === 'bottom' ? 0.6 : 0.65"
      :min-first="detailLayout === 'bottom' ? 200 : 320"
      :min-second="splitMinSecond"
      storage-key="flow-detail"
    >
      <template #first>
        <div class="flow-canvas__stage">
    <VueFlow
      :id="FLOW_ID"
      v-model:nodes="vfNodes"
      v-model:edges="vfEdges"
      class="flow-canvas__vf"
      :nodes-connectable="true"
      :nodes-draggable="true"
      :edges-focusable="false"
      :elements-selectable="false"
      :edges-updatable="false"
      :delete-key-code="null"
      :min-zoom="0.25"
      :max-zoom="2"
      :only-render-visible-elements="perfMode || graph.nodes.length > 40"
      :fit-view-on-init="false"
      @node-click="onNodeClick"
      @node-double-click="(e: NodeMouseEvent) => openInWorkspace(e.node.id)"
      @node-drag-stop="onNodeDragStop"
      @node-mouse-enter="onNodeMouseEnter"
      @node-mouse-leave="onNodeMouseLeave"
      @pane-click="onPaneClick"
      @connect-start="onConnectStart"
      @connect="onConnect"
      @connect-end="onConnectEnd"
    >
      <Background v-if="alive" variant="dots" :gap="20" :size="1" pattern-color="#d0d5dd" />

      <MiniMap
        v-if="alive && minimapOpen && !isEmpty && !perfMode"
        position="bottom-right"
        :pannable="true"
        :zoomable="true"
        :width="168"
        :height="112"
        :node-color="minimapNodeColor"
        mask-color="rgba(247, 248, 250, 0.7)"
        class="flow-minimap"
      />

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
          <button type="button" class="flow-controls__btn" aria-label="适应视图" @click="fitAll()">
            <IIcon name="expand" :size="14" />
          </button>
        </ITooltip>
        <ITooltip content="自动排列">
          <button
            type="button"
            class="flow-controls__btn"
            aria-label="自动排列"
            :disabled="isEmpty"
            @click="arrangeAll()"
          >
            <IIcon name="arrange" :size="14" />
          </button>
        </ITooltip>
        <ITooltip content="添加分析报告">
          <button
            type="button"
            class="flow-controls__btn"
            aria-label="添加分析报告"
            :disabled="!current"
            @click="addReportNode()"
          >
            <IIcon name="file-text" :size="14" />
          </button>
        </ITooltip>
        <ITooltip v-if="hasStale" content="重新运行所有待更新步骤">
          <button type="button" class="flow-controls__btn flow-controls__btn--run" aria-label="重新运行" @click="runAll()">
            <IIcon name="play" :size="14" />
            <span v-if="staleCount" class="flow-controls__run-badge">{{ staleCount }}</span>
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

      <template #edge-flow="slotProps">
        <FlowEdge v-bind="slotProps" />
      </template>
    </VueFlow>

    <div v-if="isEmpty" class="flow-empty">
      <IEmptyState
        icon="flowchart"
        title="还没有数据"
        description="导入 CSV 或合并表后，这里会展示数据加工流程"
      >
        <IButton variant="primary" icon="plus" @click="emit('add-data')">Add data</IButton>
      </IEmptyState>
    </div>
        </div>
      </template>
      <template #second>
        <StepConfigPanel
          v-if="editingStepData"
          :step="editingStepData"
          docked
          :layout="detailLayout"
          @update:layout="setDetailLayout"
          @close="closeStepEditor(true)"
          @save="onStepSaved"
          @delete="onStepDeleted(editingStep!)"
        />
        <NodeDetailCard
          v-else-if="activeNode"
          :key="activeNode.id"
          :node="activeNode"
          :inputs="activeInputs"
          :outputs="activeOutputs"
          :layout="detailLayout"
          @update:layout="setDetailLayout"
          @close="setActive(null)"
          @focus="focusNode"
          @open="openInWorkspace(activeNode.id)"
          @edit="activeNode.stepId && openStepEditor(activeNode.stepId, false)"
          @delete="onStepDeleted"
        />
      </template>
    </ISplitPane>

    <AddStepPanel
      :open="addStepOpen"
      :source="addStepSource"
      :source-port-type="addStepSourcePortType"
      @update:open="addStepOpen = $event"
      @select="onStepSelected"
    />
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

/* 详情固定模式：画布与详情用 ISplitPane 分割；悬浮模式退化为整幅画布 */
.flow-canvas__split {
  height: 100%;
}
.flow-canvas__stage {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.flow-canvas__split--solo :deep(.is-split__divider),
.flow-canvas__split--solo :deep(.is-split__second) {
  display: none;
}
.flow-canvas__split--solo :deep(.is-split__first) {
  flex: 1 1 auto !important;
}

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
  pointer-events: none;
}
.flow-banner__icon,
.flow-banner__text {
  pointer-events: none;
}
.flow-banner__close {
  pointer-events: auto;
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

.flow-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.flow-controls__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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
.flow-controls__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.flow-controls__btn--on {
  color: var(--is-accent);
  background: var(--is-accent-soft);
}
.flow-controls__btn--run {
  position: relative;
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
}
.flow-controls__btn--run:hover {
  background: #f3e3b3;
  color: var(--is-warning-text);
}
.flow-controls__run-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #e3a008;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
}
.flow-controls__zoom {
  min-width: 44px;
  height: 28px;
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
  margin: 0 4px;
}

.flow-minimap {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  overflow: hidden;
}

.flow-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(251, 252, 253, 0.85);
  z-index: 4;
}
</style>

<style>
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
.flow-canvas .flow-edge-icon__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #fff;
  border: 1px solid var(--is-border-strong);
  border-radius: 5px;
  color: var(--is-text-tertiary);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.flow-canvas .vue-flow__edge.flow-edge--active .flow-edge-icon__box {
  border-color: var(--is-success);
  color: var(--is-success);
}
.flow-canvas--perf .vue-flow__edge-path {
  shape-rendering: optimizeSpeed;
}
/* 大图（perfMode）省略边中点 foreignObject 图标，降低 SVG/DOM 开销 */
.flow-canvas--perf .flow-edge-icon {
  display: none;
}

/* 点阵背景：不用 Background 的 bg-color prop（其生成的不透明矩形盖在圆点之上），
   改为给背景 SVG 上 CSS 底色，圆点透出来。 */
.flow-canvas .vue-flow__background {
  background-color: #fbfcfd;
}

/* 拖线过程中让右侧面板不拦截鼠标，便于连到被面板遮挡的端口 */
.flow-canvas.is-connecting .step-panel,
.flow-canvas.is-connecting .add-step {
  pointer-events: none;
}
</style>
